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

export interface IApiClient {
  request<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  get<T>(endpoint: string, config?: ApiRequestConfig): Promise<T>;
  post<T>(endpoint: string, data?: any, config?: ApiRequestConfig): Promise<T>;
  put<T>(endpoint: string, data?: any, config?: ApiRequestConfig): Promise<T>;
  delete<T>(endpoint: string, config?: ApiRequestConfig): Promise<T>;
}

export interface IRateLimiter {
  checkLimit(endpoint: string, userId?: string): Promise<boolean>;
  resetLimit(endpoint: string, userId?: string): Promise<void>;
  configure(rules: RateLimitRule[]): void;
}

export interface RateLimitRule {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (endpoint: string, userId?: string) => string;
}
