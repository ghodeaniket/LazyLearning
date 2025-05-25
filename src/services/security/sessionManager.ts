import { AppState, AppStateStatus } from 'react-native';
import { encryptedStorage } from '../storage';
import { tokenManager } from '../auth/tokenManager';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { sentryService } from '../monitoring/sentry';
import { deviceFingerprint } from './deviceFingerprint';

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  startTime: number;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
}

export interface SessionConfig {
  maxInactivityMinutes: number;
  maxSessionDurationHours: number;
  enableBackgroundTimeout: boolean;
  warningBeforeTimeoutMinutes: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private readonly SESSION_KEY = 'active_session';
  private currentSession?: Session;
  private inactivityTimer?: NodeJS.Timeout;
  private warningTimer?: NodeJS.Timeout;
  private appStateSubscription?: any;
  private lastBackgroundTime?: number;

  private config: SessionConfig = {
    maxInactivityMinutes: 15,
    maxSessionDurationHours: 24,
    enableBackgroundTimeout: true,
    warningBeforeTimeoutMinutes: 2,
  };

  private onSessionExpired?: () => void;
  private onSessionWarning?: (minutesRemaining: number) => void;

  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  configure(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setCallbacks(callbacks: {
    onExpired?: () => void;
    onWarning?: (minutesRemaining: number) => void;
  }): void {
    this.onSessionExpired = callbacks.onExpired;
    this.onSessionWarning = callbacks.onWarning;
  }

  async startSession(userId: string): Promise<Session> {
    // End any existing session
    if (this.currentSession) {
      await this.endSession('new_session_started');
    }

    const fingerprint = await deviceFingerprint.getFingerprint();
    const now = Date.now();

    const session: Session = {
      id: this.generateSessionId(),
      userId,
      deviceId: fingerprint.id,
      startTime: now,
      lastActivity: now,
      expiresAt: now + (this.config.maxSessionDurationHours * 60 * 60 * 1000),
      isActive: true,
    };

    this.currentSession = session;
    await this.saveSession(session);
    this.startInactivityTimer();

    sentryService.addBreadcrumb({
      message: 'Session started',
      category: 'session',
      data: { sessionId: session.id, userId },
    });

    return session;
  }

  async endSession(reason: string = 'user_action'): Promise<void> {
    if (!this.currentSession) {return;}

    this.clearTimers();

    const session = { ...this.currentSession, isActive: false };
    await this.saveSession(session);

    sentryService.addBreadcrumb({
      message: 'Session ended',
      category: 'session',
      data: {
        sessionId: session.id,
        duration: Date.now() - session.startTime,
        reason,
      },
    });

    this.currentSession = undefined;
    await encryptedStorage.remove(this.SESSION_KEY);
  }

  async updateActivity(): Promise<void> {
    if (!this.currentSession || !this.currentSession.isActive) {return;}

    const now = Date.now();

    // Check if session has expired
    if (now > this.currentSession.expiresAt) {
      await this.handleSessionTimeout();
      return;
    }

    this.currentSession.lastActivity = now;
    await this.saveSession(this.currentSession);
    this.restartInactivityTimer();
  }

  async getSession(): Promise<Session | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    const stored = await encryptedStorage.get<Session>(this.SESSION_KEY);
    if (!stored || !stored.isActive) {
      return null;
    }

    const now = Date.now();

    // Check expiration
    if (now > stored.expiresAt) {
      await this.handleSessionTimeout();
      return null;
    }

    // Check inactivity
    const inactivityMs = now - stored.lastActivity;
    if (inactivityMs > this.config.maxInactivityMinutes * 60 * 1000) {
      await this.handleSessionTimeout();
      return null;
    }

    // Verify device hasn't changed
    const fingerprint = await deviceFingerprint.getFingerprint();
    if (stored.deviceId !== fingerprint.id) {
      await this.handleSessionTimeout();
      return null;
    }

    this.currentSession = stored;
    this.startInactivityTimer();
    return stored;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveSession(session: Session): Promise<void> {
    await encryptedStorage.set(this.SESSION_KEY, session, {
      encrypted: true,
    });
  }

  private startInactivityTimer(): void {
    this.clearTimers();

    const inactivityMs = this.config.maxInactivityMinutes * 60 * 1000;
    const warningMs = (this.config.maxInactivityMinutes - this.config.warningBeforeTimeoutMinutes) * 60 * 1000;

    // Set warning timer
    if (this.onSessionWarning && warningMs > 0) {
      this.warningTimer = setTimeout(() => {
        this.onSessionWarning?.(this.config.warningBeforeTimeoutMinutes);
      }, warningMs);
    }

    // Set timeout timer
    this.inactivityTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, inactivityMs);
  }

  private restartInactivityTimer(): void {
    this.startInactivityTimer();
  }

  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = undefined;
    }
  }

  private async handleSessionTimeout(): Promise<void> {
    errorHandler.handle(
      errorHandler.createError(
        'Session timeout',
        'SESSION_TIMEOUT',
        {
          severity: ErrorSeverity.LOW,
          userMessage: 'Your session has expired. Please sign in again.',
        },
      ),
    );

    await this.endSession('timeout');
    await tokenManager.clearTokens();

    this.onSessionExpired?.();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (!this.config.enableBackgroundTimeout) {return;}

    if (nextAppState === 'background') {
      this.lastBackgroundTime = Date.now();
      this.clearTimers();
    } else if (nextAppState === 'active' && this.lastBackgroundTime) {
      const backgroundDuration = Date.now() - this.lastBackgroundTime;
      const maxBackgroundMs = this.config.maxInactivityMinutes * 60 * 1000;

      if (backgroundDuration > maxBackgroundMs) {
        this.handleSessionTimeout();
      } else {
        this.updateActivity();
      }

      this.lastBackgroundTime = undefined;
    }
  }

  async validateSession(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) {return false;}

    // Verify with server (would be implemented with API call)
    // For now, just check local validity
    const now = Date.now();
    return (
      session.isActive &&
      now < session.expiresAt &&
      (now - session.lastActivity) < (this.config.maxInactivityMinutes * 60 * 1000)
    );
  }

  destroy(): void {
    this.clearTimers();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export const sessionManager = SessionManager.getInstance();
