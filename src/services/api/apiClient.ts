import { AxiosClient } from './axiosClient';

export interface ApiRequestConfig {
  skipAuth?: boolean;
  skipRateLimit?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  headers: any;
}

export class ApiClient {
  private static instance: ApiClient;
  private axiosClient: AxiosClient;

  private constructor() {
    this.axiosClient = new AxiosClient();
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
    try {
      const axiosConfig = {
        timeout: config.timeout,
        headers: config.headers,
        skipAuth: config.skipAuth,
        skipRateLimit: config.skipRateLimit,
        retries: config.retries,
        retryDelay: config.retryDelay,
      };

      const response = await this.axiosClient.request<T>({
        url: endpoint,
        method: 'GET',
        ...axiosConfig,
      });

      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error: any) {
      return {
        error: error.message,
        status: error.response?.status || 500,
        headers: error.response?.headers || {},
      };
    }
  }

  async get<T>(endpoint: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.axiosClient.get<T>(endpoint, config);
    return response.data;
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig,
  ): Promise<T> {
    const response = await this.axiosClient.post<T>(endpoint, data, config);
    return response.data;
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig,
  ): Promise<T> {
    const response = await this.axiosClient.put<T>(endpoint, data, config);
    return response.data;
  }

  async delete<T>(
    endpoint: string,
    config?: ApiRequestConfig,
  ): Promise<T> {
    const response = await this.axiosClient.delete<T>(endpoint, config);
    return response.data;
  }

}

export const apiClient = ApiClient.getInstance();
