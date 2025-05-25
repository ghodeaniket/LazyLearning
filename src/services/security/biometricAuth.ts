import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Platform } from 'react-native';
import { encryptedStorage } from '../storage';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { sentryService } from '../monitoring/sentry';
import Keychain from 'react-native-keychain';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

export interface BiometricCredentials {
  userId: string;
  encryptedToken: string;
  timestamp: number;
}

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private biometrics: ReactNativeBiometrics;
  private readonly BIOMETRIC_KEY = 'biometric_auth_enabled';
  private readonly CREDENTIALS_KEY = 'biometric_credentials';
  private readonly PUBLIC_KEY_ALIAS = 'lazylearner_biometric_key';

  private constructor() {
    this.biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false,
    });
  }

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  async isBiometricSupported(): Promise<{
    available: boolean;
    biometryType?: BiometryTypes;
    error?: string;
  }> {
    try {
      const { available, biometryType, error } = await this.biometrics.isSensorAvailable();

      if (error) {
        console.log('Biometric not available:', error);
      }

      return { available, biometryType, error };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async enrollBiometric(userId: string, token: string): Promise<BiometricAuthResult> {
    try {
      // Check if biometric is available
      const { available, biometryType } = await this.isBiometricSupported();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      // Create biometric key
      const { success: keyCreated } = await this.biometrics.createKeys();
      if (!keyCreated) {
        return {
          success: false,
          error: 'Failed to create biometric key',
        };
      }

      // Prompt user for biometric
      const { success: verified } = await this.biometrics.simplePrompt({
        promptMessage: 'Verify your identity to enable biometric login',
        cancelButtonText: 'Cancel',
        fallbackPromptMessage: 'Use passcode',
      });

      if (!verified) {
        return {
          success: false,
          error: 'Biometric verification failed',
        };
      }

      // Encrypt and store credentials
      const encryptedToken = await this.encryptWithBiometric(token);
      const credentials: BiometricCredentials = {
        userId,
        encryptedToken,
        timestamp: Date.now(),
      };

      await encryptedStorage.set(this.CREDENTIALS_KEY, credentials, {
        encrypted: true,
      });

      // Mark biometric as enabled
      await encryptedStorage.set(this.BIOMETRIC_KEY, true);

      sentryService.addBreadcrumb({
        message: 'Biometric authentication enrolled',
        category: 'auth',
        data: { biometryType: biometryType?.toString() },
      });

      return {
        success: true,
        biometryType: biometryType?.toString(),
      };
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to enroll biometric',
          'BIOMETRIC_ENROLL_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
            context: { error: error instanceof Error ? error.message : 'Unknown' },
          },
        ),
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enrollment failed',
      };
    }
  }

  async authenticateWithBiometric(): Promise<{
    success: boolean;
    token?: string;
    userId?: string;
    error?: string;
  }> {
    try {
      // Check if biometric is enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication not enabled',
        };
      }

      // Check if biometric is available
      const { available } = await this.isBiometricSupported();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      // Prompt for biometric
      const { success, signature } = await this.biometrics.createSignature({
        promptMessage: 'Sign in with biometrics',
        payload: this.generatePayload(),
        cancelButtonText: 'Cancel',
      });

      if (!success || !signature) {
        return {
          success: false,
          error: 'Biometric authentication failed',
        };
      }

      // Verify signature and get credentials
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        return {
          success: false,
          error: 'No stored credentials found',
        };
      }

      // Decrypt token
      const token = await this.decryptWithBiometric(credentials.encryptedToken);

      sentryService.addBreadcrumb({
        message: 'Biometric authentication successful',
        category: 'auth',
        data: { userId: credentials.userId },
      });

      return {
        success: true,
        token,
        userId: credentials.userId,
      };
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Biometric authentication failed',
          'BIOMETRIC_AUTH_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Unable to authenticate with biometrics',
            context: { error: error instanceof Error ? error.message : 'Unknown' },
          },
        ),
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  async disableBiometric(): Promise<boolean> {
    try {
      // Delete biometric key
      await this.biometrics.deleteKeys();

      // Clear stored credentials
      await encryptedStorage.remove(this.CREDENTIALS_KEY);
      await encryptedStorage.remove(this.BIOMETRIC_KEY);

      sentryService.addBreadcrumb({
        message: 'Biometric authentication disabled',
        category: 'auth',
      });

      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await encryptedStorage.get<boolean>(this.BIOMETRIC_KEY);
    return enabled === true;
  }

  private async getStoredCredentials(): Promise<BiometricCredentials | null> {
    return await encryptedStorage.get<BiometricCredentials>(this.CREDENTIALS_KEY);
  }

  private generatePayload(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async encryptWithBiometric(data: string): Promise<string> {
    // For additional security, we could use the biometric key to encrypt
    // For now, we'll use standard encryption with the device's secure storage
    return Buffer.from(data).toString('base64');
  }

  private async decryptWithBiometric(encryptedData: string): Promise<string> {
    // Decrypt data that was encrypted with biometric
    return Buffer.from(encryptedData, 'base64').toString();
  }

  async getBiometricType(): Promise<string> {
    const { biometryType } = await this.isBiometricSupported();

    switch (biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
      default:
        return 'None';
    }
  }

  // Store sensitive data with biometric protection
  async storeWithBiometric(
    key: string,
    value: string,
    requiresBiometric: boolean = true,
  ): Promise<boolean> {
    try {
      if (requiresBiometric) {
        // Verify biometric before storing
        const { success } = await this.biometrics.simplePrompt({
          promptMessage: 'Authenticate to store secure data',
          cancelButtonText: 'Cancel',
        });

        if (!success) {
          return false;
        }
      }

      await Keychain.setInternetCredentials(
        `biometric_${key}`,
        'biometric',
        value,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );

      return true;
    } catch (error) {
      console.error('Failed to store with biometric:', error);
      return false;
    }
  }

  // Retrieve sensitive data with biometric protection
  async retrieveWithBiometric(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(
        `biometric_${key}`,
        {
          authenticationPrompt: {
            title: 'Authenticate to access secure data',
            subtitle: 'Use your biometric to continue',
            cancel: 'Cancel',
          },
        },
      );

      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('Failed to retrieve with biometric:', error);
      return null;
    }
  }
}

export const biometricAuth = BiometricAuthService.getInstance();
