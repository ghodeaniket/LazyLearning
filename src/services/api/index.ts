// Legacy fetch-based clients (deprecated)
export { apiClient } from './apiClient';
export { ApiClientV2 } from './apiClientV2';

// New Axios-based client (recommended)
export {
  AxiosApiClient,
  axiosApiClient,
} from './axiosClient';
export type {
  ApiRequestConfig,
  ApiResponse,
} from './axiosClient';

// Shared utilities
export * from './rateLimiter';
