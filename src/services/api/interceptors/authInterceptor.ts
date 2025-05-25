import { IRequestInterceptor, ApiRequestConfig } from '../apiClientV2';
import { ITokenManager } from '../../interfaces/auth.interface';

export class AuthInterceptor implements IRequestInterceptor {
  constructor(private tokenManager: ITokenManager) {}

  async intercept(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    if (config.skipAuth) {
      return config;
    }

    const token = await this.tokenManager.getAccessToken();
    if (token) {
      const headers = {
        ...(config.headers as Record<string, string>),
        Authorization: `Bearer ${token}`,
      };

      return {
        ...config,
        headers,
      };
    }

    return config;
  }
}

export class RefreshTokenInterceptor implements IRequestInterceptor {
  constructor(private tokenManager: ITokenManager) {}

  async intercept(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    if (config.skipAuth) {
      return config;
    }

    const isExpired = await this.tokenManager.isTokenExpired();
    if (isExpired) {
      await this.tokenManager.refreshTokens();
    }

    return config;
  }
}
