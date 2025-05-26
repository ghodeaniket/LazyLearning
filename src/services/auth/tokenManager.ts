import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
import { authService } from '../firebase/auth';
import { errorHandler, ErrorSeverity } from '../monitoring';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

interface TokenManagerOptions {
  tokenRefreshThreshold?: number;
  onTokenRefresh?: () => void;
  onTokenExpired?: () => void;
}

export class TokenManager {
  private static instance: TokenManager;
  private readonly TOKEN_KEY = 'auth_tokens';
  private readonly SERVICE_NAME = 'com.lazylearner.auth';
  private tokenRefreshTimer?: ReturnType<typeof setTimeout>;
  private options: TokenManagerOptions;

  private constructor(options: TokenManagerOptions = {}) {
    this.options = {
      tokenRefreshThreshold: 5 * 60 * 1000,
      ...options,
    };
  }

  static getInstance(options?: TokenManagerOptions): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(options);
    }
    return TokenManager.instance;
  }

  async saveTokens(tokens: TokenData): Promise<void> {
    try {
      const tokenString = JSON.stringify(tokens);

      await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        tokens.userId,
        tokenString,
      );

      await AsyncStorage.setItem(this.TOKEN_KEY, tokens.userId);

      this.scheduleTokenRefresh(tokens);
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to save tokens',
          'TOKEN_SAVE_ERROR',
          {
            severity: ErrorSeverity.HIGH,
            userMessage: 'Authentication error. Please try again.',
          },
        ),
      );
      throw error;
    }
  }

  async getTokens(): Promise<TokenData | null> {
    try {
      const userId = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (!userId) {
        return null;
      }

      const credentials = await Keychain.getInternetCredentials(
        this.SERVICE_NAME,
      );

      if (!credentials || credentials.username !== userId) {
        return null;
      }

      const tokens = JSON.parse(credentials.password) as TokenData;

      if (this.isTokenExpired(tokens)) {
        await this.clearTokens();
        if (this.options.onTokenExpired) {
          this.options.onTokenExpired();
        }
        return null;
      }

      return tokens;
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to retrieve tokens',
          'TOKEN_RETRIEVE_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
          },
        ),
      );
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async clearTokens(): Promise<void> {
    try {
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = undefined;
      }

      // Clear keychain credentials
      try {
        await (Keychain.resetInternetCredentials as any)(this.SERVICE_NAME);
      } catch (e) {
        // Fallback: ignore error if method signature is different
      }
      await AsyncStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to clear tokens',
          'TOKEN_CLEAR_ERROR',
          {
            severity: ErrorSeverity.LOW,
          },
        ),
      );
    }
  }

  async refreshTokens(): Promise<TokenData | null> {
    try {
      const currentTokens = await this.getTokens();
      if (!currentTokens) {
        return null;
      }

      const user = authService.getCurrentUser();
      if (!user) {
        return null;
      }

      const idToken = await user.getIdToken(true);
      const idTokenResult = await user.getIdTokenResult();

      const newTokens: TokenData = {
        accessToken: idToken,
        refreshToken: currentTokens.refreshToken,
        expiresAt: new Date(idTokenResult.expirationTime).getTime(),
        userId: user.uid,
      };

      await this.saveTokens(newTokens);

      if (this.options.onTokenRefresh) {
        this.options.onTokenRefresh();
      }

      return newTokens;
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to refresh tokens',
          'TOKEN_REFRESH_ERROR',
          {
            severity: ErrorSeverity.HIGH,
            userMessage: 'Session expired. Please sign in again.',
          },
        ),
      );

      await this.clearTokens();
      if (this.options.onTokenExpired) {
        this.options.onTokenExpired();
      }

      return null;
    }
  }

  private isTokenExpired(tokens: TokenData): boolean {
    return Date.now() >= tokens.expiresAt;
  }

  private shouldRefreshToken(tokens: TokenData): boolean {
    const timeUntilExpiry = tokens.expiresAt - Date.now();
    return timeUntilExpiry <= (this.options.tokenRefreshThreshold || 0);
  }

  private scheduleTokenRefresh(tokens: TokenData): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const timeUntilRefresh = Math.max(
      0,
      tokens.expiresAt - Date.now() - (this.options.tokenRefreshThreshold || 0),
    );

    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, timeUntilRefresh);
  }

  async validateToken(): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens) {
      return false;
    }

    if (this.isTokenExpired(tokens)) {
      await this.clearTokens();
      return false;
    }

    if (this.shouldRefreshToken(tokens)) {
      const refreshedTokens = await this.refreshTokens();
      return refreshedTokens !== null;
    }

    return true;
  }
}

export const tokenManager = TokenManager.getInstance();
