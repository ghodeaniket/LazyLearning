import Config from 'react-native-config';
import { errorHandler, ErrorSeverity } from '../monitoring';

interface PinningConfig {
  hostname: string;
  pin: string;
  includeSubdomains?: boolean;
  expirationDate?: string;
}

export class CertificatePinningService {
  private static instance: CertificatePinningService;
  private pins: Map<string, PinningConfig[]> = new Map();
  private readonly isDevelopment = __DEV__;

  private constructor() {
    this.initializePins();
  }

  static getInstance(): CertificatePinningService {
    if (!CertificatePinningService.instance) {
      CertificatePinningService.instance = new CertificatePinningService();
    }
    return CertificatePinningService.instance;
  }

  private initializePins(): void {
    // Production certificate pins
    const productionPins: PinningConfig[] = [
      {
        hostname: new URL(Config.API_BASE_URL || '').hostname,
        pin: Config.API_CERT_PIN || '',
        includeSubdomains: true,
        expirationDate: '2025-12-31',
      },
      // Backup pin for certificate rotation
      {
        hostname: new URL(Config.API_BASE_URL || '').hostname,
        pin: Config.API_CERT_PIN_BACKUP || '',
        includeSubdomains: true,
        expirationDate: '2025-12-31',
      },
    ];

    // Add pins for each hostname
    productionPins.forEach(config => {
      if (config.pin && config.hostname) {
        const existing = this.pins.get(config.hostname) || [];
        existing.push(config);
        this.pins.set(config.hostname, existing);
      }
    });
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    // MVP: Certificate pinning is not implemented
    // In development and MVP, we'll use standard fetch
    console.warn('Certificate pinning is not implemented in MVP version');

    try {
      const response = await fetch(url, options);

      // Validate response headers for additional security
      this.validateSecurityHeaders(response.headers);

      return response;
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Network request failed',
          'NETWORK_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Connection failed. Please try again.',
            context: {
              url,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        ),
      );
      throw error;
    }
  }

  private getPinsForHostname(hostname: string): PinningConfig[] {
    const pins: PinningConfig[] = [];

    // Check exact match
    const exactPins = this.pins.get(hostname);
    if (exactPins) {
      pins.push(...exactPins);
    }

    // Check subdomain matches
    for (const [pinnedHost, configs] of this.pins.entries()) {
      if (configs.some(c => c.includeSubdomains)) {
        if (hostname.endsWith(`.${pinnedHost}`)) {
          pins.push(...configs.filter(c => c.includeSubdomains));
        }
      }
    }

    // Filter out expired pins
    const now = new Date();
    return pins.filter(pin => {
      if (!pin.expirationDate) {return true;}
      return new Date(pin.expirationDate) > now;
    });
  }

  private validateSecurityHeaders(headers: Headers): void {
    // Validate that response includes expected security headers
    const requiredHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
    ];

    for (const header of requiredHeaders) {
      if (!headers.has(header)) {
        console.warn(`Missing security header in response: ${header}`);
      }
    }
  }

  addPin(config: PinningConfig): void {
    if (!config.hostname || !config.pin) {
      throw new Error('Invalid pinning configuration');
    }

    const existing = this.pins.get(config.hostname) || [];
    existing.push(config);
    this.pins.set(config.hostname, existing);
  }

  removePin(hostname: string, pin?: string): void {
    if (!pin) {
      // Remove all pins for hostname
      this.pins.delete(hostname);
      return;
    }

    // Remove specific pin
    const existing = this.pins.get(hostname);
    if (existing) {
      const filtered = existing.filter(p => p.pin !== pin);
      if (filtered.length > 0) {
        this.pins.set(hostname, filtered);
      } else {
        this.pins.delete(hostname);
      }
    }
  }

  getPins(): Map<string, PinningConfig[]> {
    return new Map(this.pins);
  }
}

export const certificatePinning = CertificatePinningService.getInstance();
