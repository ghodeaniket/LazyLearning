import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import Config from 'react-native-config';
import NetInfo from '@react-native-community/netinfo';
import { tokenManager } from '../auth/tokenManager';
import { rateLimiter, defaultRateLimitRules } from './rateLimiter';
import { errorHandler, ErrorSeverity } from '../monitoring';
import { sentryService } from '../monitoring/sentry';
import { featureFlagService, FeatureFlags } from '../featureFlags';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  metadata?: {
    startTime?: number;
    requestId?: string;
    [key: string]: any;
  };
}

interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime?: number;
    requestId?: string;
    [key: string]: any;
  };
  _retry?: boolean;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipRateLimit?: boolean;
}

export interface ApiRequestConfig extends CustomAxiosRequestConfig {
  skipAuth?: boolean;
  skipRateLimit?: boolean;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: any;
  config: AxiosRequestConfig;
}

export class AxiosApiClient {
  private static instance: AxiosApiClient;
  private axiosInstance: AxiosInstance;
  private requestInterceptorId?: number;
  private responseInterceptorId?: number;

  private constructor() {
    // Create Axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: Config.API_BASE_URL || 'https://api.lazylearner.com',
      timeout: parseInt(Config.API_TIMEOUT || '30000', 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.configureRateLimiter();
  }

  static getInstance(): AxiosApiClient {
    if (!AxiosApiClient.instance) {
      AxiosApiClient.instance = new AxiosApiClient();
    }
    return AxiosApiClient.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.requestInterceptorId = this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.handleRequestInterceptor(config);
        return config;
      },
      (error) => {
        return Promise.reject(this.handleRequestError(error));
      }
    );

    // Response interceptor
    this.responseInterceptorId = this.axiosInstance.interceptors.response.use(
      async (response) => {
        await this.handleResponseSuccess(response);
        return response;
      },
      async (error) => {
        return this.handleResponseError(error);
      }
    );
  }

  private async handleRequestInterceptor(config: CustomInternalAxiosRequestConfig): Promise<void> {
    const customConfig = config as ApiRequestConfig;

    // Add performance tracking
    const enablePerformance = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_PERFORMANCE_MONITORING
    );
    if (enablePerformance) {
      config.metadata = {
        ...config.metadata,
        startTime: Date.now(),
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    // Check network connectivity
    const enableOfflineMode = await featureFlagService.isEnabled(FeatureFlags.ENABLE_OFFLINE_MODE);
    if (!enableOfflineMode) {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
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

    // Rate limiting
    const enableRateLimiting = await featureFlagService.isEnabled(FeatureFlags.ENABLE_RATE_LIMITING);
    if (enableRateLimiting && !customConfig.skipRateLimit) {
      const userId = (await tokenManager.getTokens())?.userId;
      const allowed = await rateLimiter.checkLimit(config.url || '', userId);
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

    // Authentication
    if (!customConfig.skipAuth) {
      await this.addAuthHeaders(config);
    }

    // Logging
    const enableDebug = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);
    if (enableDebug || __DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
    }

    // Sentry breadcrumb
    sentryService.addBreadcrumb({
      message: 'API Request',
      category: 'api',
      level: 'info',
      data: {
        method: config.method?.toUpperCase(),
        url: config.url,
      },
    });
  }

  private async addAuthHeaders(config: CustomInternalAxiosRequestConfig): Promise<void> {
    try {
      // Get auth headers (tokenManager handles refresh internally)
      const authHeaders = await tokenManager.getAuthHeaders();
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      Object.entries(authHeaders).forEach(([key, value]) => {
        (config.headers as AxiosHeaders).set(key, value);
      });
    } catch (error) {
      console.warn('Failed to add auth headers:', error);
    }
  }

  private handleRequestError(error: any): Error {
    return errorHandler.createError(
      'Request configuration error',
      'REQUEST_CONFIG_ERROR',
      {
        severity: ErrorSeverity.MEDIUM,
        context: { error: error.message },
      }
    );
  }

  private async handleResponseSuccess(response: AxiosResponse): Promise<void> {
    const enableDebug = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);
    const enablePerformance = await featureFlagService.isEnabled(FeatureFlags.ENABLE_PERFORMANCE_MONITORING);

    const customConfig = response.config as CustomInternalAxiosRequestConfig;
    // Performance logging
    if (enablePerformance && customConfig.metadata?.startTime) {
      const duration = Date.now() - customConfig.metadata.startTime;

      if (duration > 3000) {
        console.warn('[Performance] Slow API request detected:', {
          url: response.config.url,
          method: response.config.method,
          duration,
          status: response.status,
        });
      }

      sentryService.addBreadcrumb({
        message: 'API Performance',
        category: 'performance',
        level: duration > 3000 ? 'warning' : 'info',
        data: {
          url: response.config.url,
          method: response.config.method,
          duration,
          status: response.status,
        },
      });
    }

    // Debug logging
    if (enableDebug || __DEV__) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    // Sentry breadcrumb
    sentryService.addBreadcrumb({
      message: 'API Response',
      category: 'api',
      level: 'info',
      data: {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
      },
    });
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const customConfig = error.config as CustomInternalAxiosRequestConfig;

    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !customConfig?._retry && customConfig) {
      try {
        await tokenManager.refreshTokens();

        // Retry the original request
        customConfig._retry = true;
        const authHeaders = await tokenManager.getAuthHeaders();
        if (!customConfig.headers) {
          customConfig.headers = new AxiosHeaders();
        }
        Object.entries(authHeaders).forEach(([key, value]) => {
          (customConfig.headers as AxiosHeaders).set(key, value);
        });
        return this.axiosInstance.request(customConfig);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Token refresh failed:', refreshError);
        // You would navigate to login here
        throw errorHandler.createError(
          'Authentication failed',
          'AUTH_FAILED',
          {
            severity: ErrorSeverity.HIGH,
            userMessage: 'Please sign in again.',
          }
        );
      }
    }

    // Retry logic for network errors
    const enableRetry = await featureFlagService.isEnabled(FeatureFlags.ENABLE_REQUEST_RETRY);
    if (enableRetry && customConfig?.retries && customConfig.retries > 0 && !error.response) {
      customConfig.retries--;
      const delay = customConfig.retryDelay || 1000;

      await new Promise<void>(resolve => setTimeout(resolve, delay * Math.pow(2, (customConfig.retries || 0))));

      return this.axiosInstance.request(error.config!);
    }

    // Handle different error types
    let errorMessage = 'An unexpected error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    let severity = ErrorSeverity.MEDIUM;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      errorCode = `API_ERROR_${status}`;

      const statusMessages: Record<number, string> = {
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

      errorMessage = statusMessages[status] || `Server error (${status})`;
      severity = status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    } else if (error.request) {
      // Network error
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Network error. Please check your connection.';
      severity = ErrorSeverity.MEDIUM;
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      errorCode = 'REQUEST_TIMEOUT';
      errorMessage = 'Request timed out. Please try again.';
      severity = ErrorSeverity.LOW;
    }

    const apiError = errorHandler.createError(errorMessage, errorCode, {
      severity,
      context: {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      },
    });

    // Log to Sentry
    sentryService.captureException(apiError, {
      tags: {
        errorType: 'api_error',
        httpStatus: error.response?.status?.toString() || 'unknown',
      },
      extra: {
        url: error.config?.url,
        method: error.config?.method,
        responseData: error.response?.data,
      },
    });

    throw apiError;
  }

  private configureRateLimiter(): void {
    rateLimiter.configure(defaultRateLimitRules);
  }

  // Public API methods
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.request<T>(config);
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      config: response.config,
    };
  }

  async get<T = any>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  // Utility methods
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  destroy(): void {
    if (this.requestInterceptorId !== undefined) {
      this.axiosInstance.interceptors.request.eject(this.requestInterceptorId);
    }
    if (this.responseInterceptorId !== undefined) {
      this.axiosInstance.interceptors.response.eject(this.responseInterceptorId);
    }
  }
}

export const axiosApiClient = AxiosApiClient.getInstance();
