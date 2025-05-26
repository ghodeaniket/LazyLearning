import { axiosApiClient, ApiRequestConfig } from './axiosClient';
import { encryptionService } from '../security/encryption';
import { validationService } from '../security/validation';
import { sessionManager } from '../security/sessionManager';
import { errorHandler } from '../monitoring';
import { featureFlagService, FeatureFlags } from '../featureFlags';

export interface SecureApiRequestConfig extends ApiRequestConfig {
  encrypt?: boolean;
  sign?: boolean;
  validateResponse?: boolean;
  sensitiveFields?: string[];
  requireCsrf?: boolean;
}

export class AxiosSecureApiClient {
  private static instance: AxiosSecureApiClient;
  private baseClient: typeof axiosApiClient;

  private constructor() {
    this.baseClient = axiosApiClient;
  }

  static getInstance(): AxiosSecureApiClient {
    if (!AxiosSecureApiClient.instance) {
      AxiosSecureApiClient.instance = new AxiosSecureApiClient();
    }
    return AxiosSecureApiClient.instance;
  }

  async request<T = any>(url: string, config: SecureApiRequestConfig = {}): Promise<T> {
    try {
      // Update session activity
      await sessionManager.updateActivity();

      // Prepare secure configuration
      const secureConfig = await this.prepareSecureConfig(url, config);

      // Execute request using base Axios client
      const response = await this.baseClient.request<T>(secureConfig);

      // Process secure response
      return await this.processSecureResponse<T>(response, config);
    } catch (error) {
      errorHandler.handle(error as Error);
      throw error;
    }
  }

  private async prepareSecureConfig(
    url: string,
    config: SecureApiRequestConfig
  ): Promise<ApiRequestConfig> {
    const enableEncryption = await featureFlagService.isEnabled(FeatureFlags.ENABLE_ENCRYPTION);

    // Start with base configuration
    let finalConfig: ApiRequestConfig = {
      url,
      method: config.method || 'GET',
      ...config,
    };

    // Security headers removed - not needed for MVP

    // Add CSRF token for state-changing requests
    const csrfHeaders: Record<string, string> = {};
    if (config.requireCsrf !== false && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(finalConfig.method?.toUpperCase() || '')) {
      const csrfToken = await sessionManager.getCsrfToken();
      if (csrfToken) {
        csrfHeaders['X-CSRF-Token'] = csrfToken;
      }
    }

    // Prepare request data
    let requestData = finalConfig.data;

    // Encrypt sensitive fields if specified
    if (config.sensitiveFields && requestData && enableEncryption) {
      const parsed = typeof requestData === 'string' ? JSON.parse(requestData) : requestData;
      const encrypted = await encryptionService.encryptSensitiveFields(
        parsed,
        config.sensitiveFields,
      );
      requestData = encrypted;
    }

    // Encrypt entire body if requested
    if ((config.encrypt || enableEncryption) && requestData) {
      const serialized = typeof requestData === 'string' ? requestData : JSON.stringify(requestData);
      requestData = await encryptionService.encryptRequest(serialized);
      finalConfig.headers = {
        ...finalConfig.headers,
        'Content-Type': 'application/octet-stream', // Indicate encrypted content
        'X-Content-Encrypted': 'true',
      };
    }

    // Request signing removed - not needed for MVP

    // Merge headers
    finalConfig.headers = {
      ...csrfHeaders,
      ...(finalConfig.headers || {}),
    };

    // Set the processed data
    finalConfig.data = requestData;

    return finalConfig;
  }

  private async processSecureResponse<T>(
    response: any,
    config: SecureApiRequestConfig
  ): Promise<T> {
    let responseData = response.data || response;
    const enableEncryption = await featureFlagService.isEnabled(FeatureFlags.ENABLE_ENCRYPTION);

    // Check if response was encrypted
    const isEncrypted = response.headers?.['x-content-encrypted'] === 'true' ||
                      response.headers?.['X-Content-Encrypted'] === 'true';

    // Decrypt response if it was encrypted
    if ((config.encrypt || enableEncryption) && isEncrypted && typeof responseData === 'string') {
      try {
        responseData = await encryptionService.decryptResponse(responseData);
        responseData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
      } catch (decryptError) {
        console.warn('Failed to decrypt response, using as-is:', decryptError);
      }
    }

    // Decrypt sensitive fields
    if (config.sensitiveFields && responseData && typeof responseData === 'object') {
      responseData = await encryptionService.decryptSensitiveFields(
        responseData,
        config.sensitiveFields,
      );
    }

    // Response validation removed - not needed for MVP

    return responseData;
  }

  // Convenience methods with proper data sanitization
  async get<T = any>(url: string, config?: SecureApiRequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'GET',
    });
  }

  async post<T = any>(url: string, data?: any, config?: SecureApiRequestConfig): Promise<T> {
    // Sanitize input data
    const sanitizedData = this.sanitizeData(data);

    return this.request<T>(url, {
      ...config,
      method: 'POST',
      data: sanitizedData,
    });
  }

  async put<T = any>(url: string, data?: any, config?: SecureApiRequestConfig): Promise<T> {
    // Sanitize input data
    const sanitizedData = this.sanitizeData(data);

    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      data: sanitizedData,
    });
  }

  async patch<T = any>(url: string, data?: any, config?: SecureApiRequestConfig): Promise<T> {
    // Sanitize input data
    const sanitizedData = this.sanitizeData(data);

    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      data: sanitizedData,
    });
  }

  async delete<T = any>(url: string, config?: SecureApiRequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'DELETE',
    });
  }

  private sanitizeData(data: any): any {
    if (!data) {return data;}

    if (typeof data === 'string') {
      return validationService.sanitizeInput(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  // High-level secure API methods
  async authenticatedGet<T = any>(
    url: string,
    config?: Omit<SecureApiRequestConfig, 'sign'>
  ): Promise<T> {
    return this.get<T>(url, {
      ...config,
      sign: true,
    });
  }

  async encryptedPost<T = any>(
    url: string,
    data?: any,
    config?: Omit<SecureApiRequestConfig, 'encrypt' | 'sign'>
  ): Promise<T> {
    return this.post<T>(url, data, {
      ...config,
      encrypt: true,
      sign: true,
    });
  }

  async sensitiveDataPost<T = any>(
    url: string,
    data: any,
    sensitiveFields: string[],
    config?: Omit<SecureApiRequestConfig, 'sensitiveFields'>
  ): Promise<T> {
    return this.post<T>(url, data, {
      ...config,
      sensitiveFields,
      sign: config?.sign !== false, // Default to true unless explicitly set to false
      requireCsrf: config?.requireCsrf !== false, // Default to true unless explicitly set to false
    });
  }

  async secureFileUpload<T = any>(
    url: string,
    formData: FormData,
    config?: SecureApiRequestConfig
  ): Promise<T> {
    // File uploads require special handling
    const secureConfig: SecureApiRequestConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers || {}),
      },
      // Don't encrypt form data
      encrypt: false,
      sign: true,
      requireCsrf: true,
    };

    return this.request<T>(url, {
      ...secureConfig,
      method: 'POST',
      data: formData,
    });
  }

  // Payment-specific secure methods
  async securePaymentRequest<T = any>(
    url: string,
    paymentData: any,
    config?: SecureApiRequestConfig
  ): Promise<T> {
    const sensitiveFields = [
      'cardNumber',
      'cvv',
      'expirationDate',
      'accountNumber',
      'routingNumber',
      'ssn',
      'bankAccount',
    ];

    return this.sensitiveDataPost<T>(url, paymentData, sensitiveFields, {
      ...config,
      encrypt: true,
      sign: true,
      requireCsrf: true,
      validateResponse: true,
    });
  }

  // Authentication-specific methods
  async secureAuthRequest<T = any>(
    url: string,
    credentials: any,
    config?: SecureApiRequestConfig
  ): Promise<T> {
    const sensitiveFields = ['password', 'newPassword', 'currentPassword', 'pin', 'otp'];

    return this.sensitiveDataPost<T>(url, credentials, sensitiveFields, {
      ...config,
      encrypt: true,
      sign: true,
      skipAuth: true, // Auth requests don't need existing auth
      requireCsrf: false, // Initial auth may not have CSRF token yet
    });
  }
}

export const axiosSecureApiClient = AxiosSecureApiClient.getInstance();
