import JailMonkey from 'jail-monkey';
import { Platform } from 'react-native';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { sentryService } from '../monitoring/sentry';
import { encryptedStorage } from '../storage';

export interface SecurityCheckResult {
  isJailbroken: boolean;
  isRooted: boolean;
  isDebuggedMode: boolean;
  hookDetected: boolean;
  canMockLocation: boolean;
  isFromAppStore: boolean;
  timestamp: number;
  details: string[];
}

export class JailbreakDetectionService {
  private static instance: JailbreakDetectionService;
  private readonly CHECK_CACHE_KEY = 'security_check_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private lastCheck?: SecurityCheckResult;

  private constructor() {}

  static getInstance(): JailbreakDetectionService {
    if (!JailbreakDetectionService.instance) {
      JailbreakDetectionService.instance = new JailbreakDetectionService();
    }
    return JailbreakDetectionService.instance;
  }

  async performSecurityCheck(): Promise<SecurityCheckResult> {
    // Check cache first
    if (this.lastCheck && this.isCacheValid(this.lastCheck)) {
      return this.lastCheck;
    }

    const cached = await this.getCachedCheck();
    if (cached && this.isCacheValid(cached)) {
      this.lastCheck = cached;
      return cached;
    }

    // Perform new check
    const result = await this.runSecurityChecks();
    await this.cacheCheckResult(result);
    this.lastCheck = result;

    // Log security events
    if (result.isJailbroken || result.isRooted) {
      this.logSecurityEvent('device_compromised', result);
    }

    return result;
  }

  private async runSecurityChecks(): Promise<SecurityCheckResult> {
    const details: string[] = [];

    // Basic jailbreak/root detection
    const isJailbroken = JailMonkey.isJailBroken();
    const isRooted = Platform.OS === 'android' && isJailbroken;

    if (isJailbroken) {
      details.push(Platform.OS === 'ios' ? 'Jailbreak detected' : 'Root detected');
    }

    // Debug mode detection
    const isDebuggedMode = JailMonkey.isDebuggedMode();
    if (isDebuggedMode) {
      details.push('Debug mode detected');
    }

    // Hook detection (checks for code injection)
    const hookDetected = this.detectHooks();
    if (hookDetected) {
      details.push('Code injection detected');
    }

    // Location mocking detection
    const canMockLocation = JailMonkey.canMockLocation();
    if (canMockLocation) {
      details.push('Location mocking possible');
    }

    // App store verification
    const isFromAppStore = await this.verifyAppSource();
    if (!isFromAppStore && !__DEV__) {
      details.push('App not from official store');
    }

    // Additional platform-specific checks
    if (Platform.OS === 'ios') {
      this.performIOSChecks(details);
    } else if (Platform.OS === 'android') {
      this.performAndroidChecks(details);
    }

    const result: SecurityCheckResult = {
      isJailbroken,
      isRooted,
      isDebuggedMode,
      hookDetected,
      canMockLocation,
      isFromAppStore,
      timestamp: Date.now(),
      details,
    };

    return result;
  }

  private detectHooks(): boolean {
    try {
      // Check for common hooking frameworks
      if (Platform.OS === 'ios') {
        // Check for Cydia Substrate
        const substrate = (global as any).MSHookFunction;
        if (substrate) {return true;}

        // Check for Frida
        const frida = (global as any).frida;
        if (frida) {return true;}
      }

      // Check for method swizzling
      const nativeFetch = global.fetch.toString();
      if (!nativeFetch.includes('[native code]')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async verifyAppSource(): Promise<boolean> {
    if (__DEV__) {return true;}

    try {
      if (Platform.OS === 'ios') {
        // Check if app is from TestFlight or App Store
        const isFromAppStore = !(await JailMonkey.isJailBroken());
        return isFromAppStore;
      } else {
        // Android: Check if installed from Play Store
        // This would require native module implementation
        return true;
      }
    } catch {
      return false;
    }
  }

  private performIOSChecks(_details: string[]): void {
    // Check for common jailbreak paths
    // Note: File system checks would require native implementation
    // This is a placeholder for the concept
  }

  private performAndroidChecks(_details: string[]): void {
    // Check for common root indicators
    // Check for dangerous permissions
    // This would require native module implementation
  }

  private isCacheValid(check: SecurityCheckResult): boolean {
    return Date.now() - check.timestamp < this.CACHE_DURATION;
  }

  private async getCachedCheck(): Promise<SecurityCheckResult | null> {
    return await encryptedStorage.get<SecurityCheckResult>(this.CHECK_CACHE_KEY);
  }

  private async cacheCheckResult(result: SecurityCheckResult): Promise<void> {
    await encryptedStorage.set(this.CHECK_CACHE_KEY, result, {
      encrypted: true,
      expiresIn: this.CACHE_DURATION,
    });
  }

  private logSecurityEvent(event: string, data: any): void {
    sentryService.captureMessage(
      `Security event: ${event}`,
      'warning' as any,
    );

    sentryService.addBreadcrumb({
      message: event,
      category: 'security',
      level: 'warning' as any,
      data,
    });
  }

  async isDeviceSecure(): Promise<boolean> {
    const check = await this.performSecurityCheck();

    // In development, only warn
    if (__DEV__) {
      if (!this.isCheckPassed(check)) {
        console.warn('Security check failed:', check.details);
      }
      return true;
    }

    return this.isCheckPassed(check);
  }

  private isCheckPassed(check: SecurityCheckResult): boolean {
    return (
      !check.isJailbroken &&
      !check.isRooted &&
      !check.hookDetected &&
      check.isFromAppStore
    );
  }

  async handleSecurityViolation(check: SecurityCheckResult): Promise<void> {
    // Log the violation
    errorHandler.handle(
      errorHandler.createError(
        'Security violation detected',
        'SECURITY_VIOLATION',
        {
          severity: ErrorSeverity.CRITICAL,
          userMessage: 'This app cannot run on compromised devices for your security.',
          context: {
            details: check.details,
            timestamp: check.timestamp,
          },
        },
      ),
    );

    // Clear sensitive data
    await this.clearSensitiveData();
  }

  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear tokens
      const { tokenManager } = await import('../auth/tokenManager');
      await tokenManager.clearTokens();

      // Clear encrypted storage
      await encryptedStorage.clear();
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  }
}

export const jailbreakDetection = JailbreakDetectionService.getInstance();
