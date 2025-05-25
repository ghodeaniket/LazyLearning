import { Platform } from 'react-native';
import Config from 'react-native-config';

export interface SecurityHeaders {
  [key: string]: string;
}

export class SecurityHeadersService {
  private static instance: SecurityHeadersService;
  private readonly isDevelopment = __DEV__;

  private constructor() {}

  static getInstance(): SecurityHeadersService {
    if (!SecurityHeadersService.instance) {
      SecurityHeadersService.instance = new SecurityHeadersService();
    }
    return SecurityHeadersService.instance;
  }

  getSecurityHeaders(): SecurityHeaders {
    const headers: SecurityHeaders = {
      // Prevent clickjacking attacks
      'X-Frame-Options': 'DENY',

      // Enable browser XSS protection
      'X-XSS-Protection': '1; mode=block',

      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',

      // Control referrer information
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Feature Policy / Permissions Policy
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

      // Platform identification
      'X-Client-Platform': Platform.OS,
      'X-Client-Version': Platform.Version.toString(),
    };

    // Add CSP header for web views
    if (Platform.OS === 'web') {
      headers['Content-Security-Policy'] = this.getCSPPolicy();
    }

    // Add HSTS for production
    if (!this.isDevelopment) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }

  private getCSPPolicy(): string {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React Native
      "style-src 'self' 'unsafe-inline'", // Required for inline styles
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' " + Config.API_BASE_URL,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    if (this.isDevelopment) {
      // Allow localhost connections in development
      policies.push("connect-src 'self' ws://localhost:* http://localhost:*");
    }

    return policies.join('; ');
  }

  validateIncomingHeaders(headers: Headers): boolean {
    // Check for required security headers from server
    const requiredHeaders = [
      'x-request-id',
      'x-frame-options',
      'x-content-type-options',
    ];

    for (const header of requiredHeaders) {
      if (!headers.has(header)) {
        console.warn(`Missing security header: ${header}`);
        return false;
      }
    }

    return true;
  }
}

export const securityHeaders = SecurityHeadersService.getInstance();
