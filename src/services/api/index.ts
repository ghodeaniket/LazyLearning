// Legacy fetch-based clients (deprecated)
export { apiClient } from './apiClient';
export { ApiClientV2 } from './apiClientV2';
export { secureApiClient } from './secureApiClient';

// New Axios-based clients (recommended)
export {
  AxiosApiClient,
  axiosApiClient,
} from './axiosClient';
export type {
  ApiRequestConfig,
  ApiResponse,
} from './axiosClient';
export {
  AxiosSecureApiClient,
  axiosSecureApiClient,
} from './axiosSecureClient';
export type {
  SecureApiRequestConfig,
} from './axiosSecureClient';

// Shared utilities
export * from './rateLimiter';
