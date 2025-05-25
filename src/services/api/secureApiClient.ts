import { ApiRequestConfig, ApiResponse } from './apiClient';
import { securityHeaders } from '../security/headers';
import { requestSigning } from '../security/requestSigning';
import { certificatePinning } from '../security/certificatePinning';
import { encryptionService } from '../security/encryption';
import { deviceFingerprint } from '../security/deviceFingerprint';
import { validationService } from '../security/validation';
import { sessionManager } from '../security/sessionManager';
import { errorHandler, ErrorSeverity } from '../monitoring';

export interface SecureApiRequestConfig extends ApiRequestConfig {
  encrypt?: boolean;
  sign?: boolean;
  validateResponse?: boolean;
  sensitiveFields?: string[];
}

export class SecureApiClient {
  private static instance: SecureApiClient;

  private constructor() {}

  static getInstance(): SecureApiClient {
    if (!SecureApiClient.instance) {
      SecureApiClient.instance = new SecureApiClient();
    }
    return SecureApiClient.instance;
  }

  async request<T>(
    endpoint: string,
    config: SecureApiRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    try {
      // Update session activity
      await sessionManager.updateActivity();

      // Get security headers
      const baseSecurityHeaders = securityHeaders.getSecurityHeaders();
      const deviceHeaders = await deviceFingerprint.getFingerprintHeaders();

      // Prepare request data
      let body = config.body;

      // Encrypt sensitive fields if specified
      if (config.sensitiveFields && body) {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        const encrypted = await encryptionService.encryptSensitiveFields(
          parsed,
          config.sensitiveFields,
        );
        body = JSON.stringify(encrypted);
      }

      // Encrypt entire body if requested
      if (config.encrypt && body) {
        body = await encryptionService.encryptRequest(body);
      }

      // Sign request if requested
      let signatureHeaders = {};
      if (config.sign !== false) {
        const signatureData = await requestSigning.signRequest({
          method: config.method || 'GET',
          url: endpoint,
          body: body as string,
        });
        signatureHeaders = requestSigning.getSigningHeaders(signatureData);
      }

      // Merge all headers
      const headers = {
        ...baseSecurityHeaders,
        ...deviceHeaders,
        ...signatureHeaders,
        ...(config.headers as Record<string, string>),
      };

      // Use certificate pinning for the request
      const response = await certificatePinning.fetch(endpoint, {
        ...config,
        headers,
        body,
      });

      // Convert to ApiResponse format
      const contentType = response.headers.get('content-type');
      let data: T | undefined;

      if (contentType?.includes('application/json')) {
        const responseText = await response.text();

        // Decrypt response if it was encrypted
        let decrypted = responseText;
        if (config.encrypt) {
          try {
            decrypted = await encryptionService.decryptResponse(responseText);
          } catch {
            // Response might not be encrypted
          }
        }

        data = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;

        // Decrypt sensitive fields
        if (config.sensitiveFields && data) {
          data = await encryptionService.decryptSensitiveFields(
            data as Record<string, any>,
            config.sensitiveFields,
          ) as T;
        }
      }

      if (!response.ok) {
        throw errorHandler.createError(
          `Secure API Error: ${response.status}`,
          `SECURE_API_ERROR_${response.status}`,
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Request failed. Please try again.',
            context: {
              endpoint,
              status: response.status,
            },
          },
        );
      }

      // Validate response headers
      if (config.validateResponse !== false) {
        securityHeaders.validateIncomingHeaders(response.headers);
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      errorHandler.handle(error as Error);
      throw error;
    }
  }

  async get<T>(endpoint: string, config?: SecureApiRequestConfig): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    });
    return response.data as T;
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: SecureApiRequestConfig,
  ): Promise<T> {
    // Validate input data if provided
    if (data && config?.validateResponse !== false) {
      const sanitized = this.sanitizeData(data);
      data = sanitized;
    }

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
    config?: SecureApiRequestConfig,
  ): Promise<T> {
    // Validate input data if provided
    if (data && config?.validateResponse !== false) {
      const sanitized = this.sanitizeData(data);
      data = sanitized;
    }

    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data as T;
  }

  async delete<T>(
    endpoint: string,
    config?: SecureApiRequestConfig,
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
    return response.data as T;
  }

  private sanitizeData(data: any): any {
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

  // Convenience methods for common secure operations
  async authenticatedGet<T>(
    endpoint: string,
    config?: Omit<SecureApiRequestConfig, 'sign'>,
  ): Promise<T> {
    return this.get<T>(endpoint, {
      ...config,
      sign: true,
    });
  }

  async encryptedPost<T>(
    endpoint: string,
    data?: any,
    config?: Omit<SecureApiRequestConfig, 'encrypt' | 'sign'>,
  ): Promise<T> {
    return this.post<T>(endpoint, data, {
      ...config,
      encrypt: true,
      sign: true,
    });
  }

  async sensitiveDataPost<T>(
    endpoint: string,
    data: any,
    sensitiveFields: string[],
    config?: Omit<SecureApiRequestConfig, 'sensitiveFields' | 'sign'>,
  ): Promise<T> {
    return this.post<T>(endpoint, data, {
      ...config,
      sensitiveFields,
      sign: true,
    });
  }
}

export const secureApiClient = SecureApiClient.getInstance();
