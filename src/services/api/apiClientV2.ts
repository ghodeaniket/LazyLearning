import Config from 'react-native-config';
import NetInfo from '@react-native-community/netinfo';
import { IApiClient, ApiRequestConfig as IApiRequestConfig, ApiResponse as IApiResponse } from '../interfaces/api.interface';
import { ITokenManager } from '../interfaces/auth.interface';
import { IRateLimiter } from '../interfaces/api.interface';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { featureFlagService, FeatureFlags } from '../featureFlags';

// Re-export for interceptors
export type ApiRequestConfig = IApiRequestConfig;
export type ApiResponse<T> = IApiResponse<T>;

// Request interceptor interface
export interface IRequestInterceptor {
  intercept(config: ApiRequestConfig): Promise<ApiRequestConfig>;
}

// Response interceptor interface
export interface IResponseInterceptor {
  intercept<T>(response: Response, request: ApiRequestConfig): Promise<ApiResponse<T>>;
}

// Network connectivity checker
export interface INetworkChecker {
  isOnline(): Promise<boolean>;
}

// Request executor
export interface IRequestExecutor {
  execute(url: string, config: RequestInit): Promise<Response>;
}

// Default implementations following Single Responsibility Principle
export class NetworkChecker implements INetworkChecker {
  async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  }
}

export class FetchRequestExecutor implements IRequestExecutor {
  async execute(url: string, config: RequestInit): Promise<Response> {
    return fetch(url, config);
  }
}

export class RetryRequestExecutor implements IRequestExecutor {
  constructor(
    private baseExecutor: IRequestExecutor,
    private maxRetries: number = 3,
    private baseDelay: number = 1000
  ) {}

  async execute(url: string, config: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.baseExecutor.execute(url, config);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise<void>(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Main API Client following SOLID principles
export class ApiClientV2 implements IApiClient {
  private requestInterceptors: IRequestInterceptor[] = [];
  private responseInterceptors: IResponseInterceptor[] = [];

  constructor(
    private baseURL: string,
    private requestExecutor: IRequestExecutor,
    private networkChecker: INetworkChecker,
    private tokenManager?: ITokenManager,
    private rateLimiter?: IRateLimiter,
    private defaultTimeout: number = 30000
  ) {}

  addRequestInterceptor(interceptor: IRequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: IResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    // Check feature flags
    const enableRateLimiting = await featureFlagService.isEnabled(FeatureFlags.ENABLE_RATE_LIMITING);
    const enableRetry = await featureFlagService.isEnabled(FeatureFlags.ENABLE_REQUEST_RETRY);
    const enableOfflineMode = await featureFlagService.isEnabled(FeatureFlags.ENABLE_OFFLINE_MODE);

    // Build URL
    const url = this.buildURL(endpoint);

    // Check network connectivity
    if (!enableOfflineMode) {
      const isOnline = await this.networkChecker.isOnline();
      if (!isOnline) {
        throw errorHandler.createError(
          'No internet connection',
          'NETWORK_OFFLINE',
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Please check your internet connection.',
          }
        );
      }
    }

    // Apply rate limiting if enabled
    if (enableRateLimiting && !config.skipRateLimit && this.rateLimiter) {
      const userId = this.tokenManager ? (await this.tokenManager.getTokens())?.userId : undefined;
      const allowed = await this.rateLimiter.checkLimit(endpoint, userId);
      if (!allowed) {
        throw errorHandler.createError(
          'Rate limit exceeded',
          'RATE_LIMIT',
          {
            severity: ErrorSeverity.LOW,
            userMessage: 'Too many requests. Please try again later.',
          }
        );
      }
    }

    // Apply request interceptors
    let interceptedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      interceptedConfig = await interceptor.intercept(interceptedConfig);
    }

    // Build headers
    const headers = await this.buildHeaders(interceptedConfig);

    // Set up timeout
    const timeout = interceptedConfig.timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Execute request with optional retry
      const executor = enableRetry && interceptedConfig.retries
        ? new RetryRequestExecutor(this.requestExecutor, interceptedConfig.retries, interceptedConfig.retryDelay)
        : this.requestExecutor;

      const response = await executor.execute(url, {
        ...interceptedConfig,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Apply response interceptors
      let apiResponse = await this.parseResponse<T>(response);
      for (const interceptor of this.responseInterceptors) {
        apiResponse = await interceptor.intercept<T>(response, interceptedConfig);
      }

      if (!response.ok) {
        throw errorHandler.createError(
          `API Error: ${response.status}`,
          `API_ERROR_${response.status}`,
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: this.getErrorMessage(response.status),
            context: {
              endpoint,
              status: response.status,
              data: apiResponse.data,
            },
          }
        );
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw errorHandler.createError(
          'Request timeout',
          'REQUEST_TIMEOUT',
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Request timed out. Please try again.',
          }
        );
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    });
    return response.data as T;
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data as T;
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data as T;
  }

  async delete<T>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
    return response.data as T;
  }

  private buildURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  private async buildHeaders(
    config: ApiRequestConfig
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((config.headers as Record<string, string>) || {}),
    };

    if (!config.skipAuth && this.tokenManager) {
      const authHeaders = await this.tokenManager.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    let data: T | undefined;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  private getErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Please sign in to continue.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      408: 'Request timed out. Please try again.',
      429: 'Too many requests. Please try again later.',
      500: 'Server error. Please try again later.',
      502: 'Server is temporarily unavailable.',
      503: 'Service unavailable. Please try again later.',
    };

    return messages[status] || 'An unexpected error occurred.';
  }
}

// Factory for creating API client instances
export class ApiClientFactory {
  static create(
    config: {
      baseURL?: string;
      tokenManager?: ITokenManager;
      rateLimiter?: IRateLimiter;
      timeout?: number;
      enableRetry?: boolean;
    } = {}
  ): IApiClient {
    const baseURL = config.baseURL || Config.API_BASE_URL || 'https://api.lazylearner.com';
    const timeout = config.timeout || parseInt(Config.API_TIMEOUT || '30000', 10);

    const networkChecker = new NetworkChecker();
    const baseExecutor = new FetchRequestExecutor();
    const requestExecutor = config.enableRetry
      ? new RetryRequestExecutor(baseExecutor)
      : baseExecutor;

    return new ApiClientV2(
      baseURL,
      requestExecutor,
      networkChecker,
      config.tokenManager,
      config.rateLimiter,
      timeout
    );
  }
}
