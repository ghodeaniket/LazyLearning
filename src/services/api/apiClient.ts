import Config from 'react-native-config';
import { tokenManager } from '../auth/tokenManager';
import { rateLimiter, defaultRateLimitRules } from './rateLimiter';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { sentryService } from '../monitoring/sentry';
import NetInfo from '@react-native-community/netinfo';

export interface ApiRequestConfig extends RequestInit {
  skipAuth?: boolean;
  skipRateLimit?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  headers: Headers;
}

export class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;
  private defaultTimeout: number;

  private constructor() {
    this.baseURL = Config.API_BASE_URL || 'https://api.lazylearner.com';
    this.defaultTimeout = parseInt(Config.API_TIMEOUT || '30000', 10);

    rateLimiter.configure(defaultRateLimitRules);
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint);
    const userId = (await tokenManager.getTokens())?.userId;

    if (!config.skipRateLimit) {
      const allowed = await rateLimiter.checkLimit(endpoint, userId);
      if (!allowed) {
        throw errorHandler.createError(
          'Rate limit exceeded',
          'RATE_LIMIT',
          {
            severity: ErrorSeverity.LOW,
            userMessage: 'Too many requests. Please try again later.',
          },
        );
      }
    }

    const isOnline = await this.checkNetworkConnection();
    if (!isOnline) {
      throw errorHandler.createError(
        'No internet connection',
        'NETWORK_OFFLINE',
        {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'Please check your internet connection.',
        },
      );
    }

    const headers = await this.buildHeaders(config);
    const timeout = config.timeout || this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const transaction = sentryService.startTransaction(
      `API ${config.method || 'GET'} ${endpoint}`,
      'http.client',
    );

    try {
      const response = await this.executeRequest(
        url,
        {
          ...config,
          headers,
          signal: controller.signal,
        },
        config.retries || 0,
        config.retryDelay || 1000,
      );

      clearTimeout(timeoutId);
      transaction?.finish();

      const contentType = response.headers.get('content-type');
      let data: T | undefined;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        const error = errorHandler.createError(
          `API Error: ${response.status}`,
          `API_ERROR_${response.status}`,
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: this.getErrorMessage(response.status),
            context: {
              endpoint,
              status: response.status,
              data,
            },
          },
        );
        throw error;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      transaction?.finish();

      if (error instanceof Error && error.name === 'AbortError') {
        throw errorHandler.createError(
          'Request timeout',
          'REQUEST_TIMEOUT',
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Request timed out. Please try again.',
          },
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
    config?: ApiRequestConfig,
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
    config?: ApiRequestConfig,
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
    config?: ApiRequestConfig,
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
    config: ApiRequestConfig,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((config.headers as Record<string, string>) || {}),
    };

    if (!config.skipAuth) {
      const authHeaders = await tokenManager.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    return headers;
  }

  private async executeRequest(
    url: string,
    config: RequestInit,
    retries: number,
    retryDelay: number,
  ): Promise<Response> {
    try {
      return await fetch(url, config);
    } catch (error) {
      if (retries > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, retryDelay));
        return this.executeRequest(
          url,
          config,
          retries - 1,
          retryDelay * 2,
        );
      }
      throw error;
    }
  }

  private async checkNetworkConnection(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
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

export const apiClient = ApiClient.getInstance();
