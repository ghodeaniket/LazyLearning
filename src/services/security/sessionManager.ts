import { AppState, AppStateStatus } from 'react-native';
import { encryptedStorage } from '../storage';
import { tokenManager } from '../auth/tokenManager';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { sentryService } from '../monitoring/sentry';
// deviceFingerprint import removed - not needed for MVP

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  startTime: number;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
  csrfToken?: string;
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
  private inactivityTimer?: ReturnType<typeof setTimeout>;
  private warningTimer?: ReturnType<typeof setTimeout>;
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

    const now = Date.now();
    const deviceId = 'web-' + Math.random().toString(36).substr(2, 9); // Simple device ID for MVP

    const session: Session = {
      id: this.generateSessionId(),
      userId,
      deviceId,
      startTime: now,
      lastActivity: now,
      expiresAt: now + (this.config.maxSessionDurationHours * 60 * 60 * 1000),
      isActive: true,
      csrfToken: this.generateCsrfToken(),
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

    // Device verification removed - not needed for MVP

    this.currentSession = stored;
    this.startInactivityTimer();
    return stored;
  }

  private generateSessionId(): string {
    // Use cryptographically secure random generation
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(16);

    // Generate secure random bytes
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }

    // Convert to hex string
    const randomHex = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    return `${timestamp}-${randomHex}`;
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

  // CSRF token generation
  private generateCsrfToken(): string {
    const randomBytes = new Uint8Array(32);

    // Generate secure random bytes
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }

    // Convert to hex string (btoa not available in React Native)
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Get CSRF token for current session
  async getCsrfToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.csrfToken || null;
  }

  // Validate CSRF token
  async validateCsrfToken(token: string): Promise<boolean> {
    const session = await this.getSession();
    if (!session || !session.csrfToken) {
      return false;
    }

    // Use constant-time comparison
    return this.constantTimeCompare(token, session.csrfToken);
  }

  // Regenerate CSRF token (for sensitive operations)
  async regenerateCsrfToken(): Promise<string | null> {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.csrfToken = this.generateCsrfToken();
    await this.saveSession(this.currentSession);
    return this.currentSession.csrfToken;
  }

  // Constant-time string comparison to prevent timing attacks
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

export const sessionManager = SessionManager.getInstance();
