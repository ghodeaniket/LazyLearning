import { AxiosSecureClient } from './axiosSecureClient';
import { ApiRequestConfig, ApiResponse } from './apiClient';

export interface SecureApiRequestConfig extends ApiRequestConfig {
  encrypt?: boolean;
  sign?: boolean;
  validateResponse?: boolean;
  sensitiveFields?: string[];
}

export class SecureApiClient {
  private static instance: SecureApiClient;
  private axiosSecureClient: AxiosSecureClient;

  private constructor() {
    this.axiosSecureClient = new AxiosSecureClient();
  }

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

      // Add CSRF token for state-changing requests
      const csrfHeaders: Record<string, string> = {};
      if (config.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
        const csrfToken = await sessionManager.getCsrfToken();
        if (csrfToken) {
          csrfHeaders['X-CSRF-Token'] = csrfToken;
        }
      }

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
        ...csrfHeaders,
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
    const response = await this.axiosSecureClient.get<T>(endpoint, config);
    return response.data;
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: SecureApiRequestConfig,
  ): Promise<T> {
    const response = await this.axiosSecureClient.post<T>(endpoint, data, config);
    return response.data;
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: SecureApiRequestConfig,
  ): Promise<T> {
    const response = await this.axiosSecureClient.put<T>(endpoint, data, config);
    return response.data;
  }

  async delete<T>(
    endpoint: string,
    config?: SecureApiRequestConfig,
  ): Promise<T> {
    const response = await this.axiosSecureClient.delete<T>(endpoint, config);
    return response.data;
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
    const response = await this.axiosSecureClient.secureRequest<T>(endpoint, {
      method: 'GET',
      ...config,
    });
    return response.data;
  }

  async encryptedPost<T>(
    endpoint: string,
    data?: any,
    config?: Omit<SecureApiRequestConfig, 'encrypt' | 'sign'>,
  ): Promise<T> {
    const response = await this.axiosSecureClient.secureRequest<T>(endpoint, {
      method: 'POST',
      data,
      ...config,
    });
    return response.data;
  }

  async sensitiveDataPost<T>(
    endpoint: string,
    data: any,
    sensitiveFields: string[],
    config?: Omit<SecureApiRequestConfig, 'sensitiveFields' | 'sign'>,
  ): Promise<T> {
    const response = await this.axiosSecureClient.securePaymentRequest<T>(endpoint, data, {
      ...config,
    });
    return response.data;
  }
}

export const secureApiClient = SecureApiClient.getInstance();
