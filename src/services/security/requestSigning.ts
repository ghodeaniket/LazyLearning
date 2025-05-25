import CryptoJS from 'react-native-crypto-js';
import { encryptedStorage } from '../storage';
import Config from 'react-native-config';

interface SignatureOptions {
  method: string;
  url: string;
  body?: string;
  timestamp: number;
  nonce: string;
}

export class RequestSigningService {
  private static instance: RequestSigningService;
  private readonly SIGNING_KEY_NAME = 'api_signing_key';
  private signingKey?: string;

  private constructor() {}

  static getInstance(): RequestSigningService {
    if (!RequestSigningService.instance) {
      RequestSigningService.instance = new RequestSigningService();
    }
    return RequestSigningService.instance;
  }

  async initialize(): Promise<void> {
    // Generate or retrieve signing key
    const storedKey = await encryptedStorage.get<string>(this.SIGNING_KEY_NAME);

    if (!storedKey) {
      this.signingKey = this.generateSigningKey();
      await encryptedStorage.set(this.SIGNING_KEY_NAME, this.signingKey, {
        encrypted: true,
      });
    } else {
      this.signingKey = storedKey;
    }
  }

  private generateSigningKey(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  async signRequest(options: Omit<SignatureOptions, 'timestamp' | 'nonce'>): Promise<{
    signature: string;
    timestamp: number;
    nonce: string;
  }> {
    if (!this.signingKey) {
      await this.initialize();
    }

    const timestamp = Date.now();
    const nonce = this.generateNonce();

    const signatureData: SignatureOptions = {
      ...options,
      timestamp,
      nonce,
    };

    const signature = this.generateSignature(signatureData);

    return {
      signature,
      timestamp,
      nonce,
    };
  }

  private generateNonce(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  private generateSignature(data: SignatureOptions): string {
    // Create canonical string for signing
    const canonicalString = [
      data.method.toUpperCase(),
      data.url,
      data.timestamp,
      data.nonce,
      data.body ? CryptoJS.MD5(data.body).toString() : '',
    ].join('\n');

    // Generate HMAC signature
    const signature = CryptoJS.HmacSHA256(
      canonicalString,
      this.signingKey!,
    ).toString(CryptoJS.enc.Base64);

    return signature;
  }

  verifySignature(
    signature: string,
    options: SignatureOptions,
  ): boolean {
    if (!this.signingKey) {
      console.error('Signing key not initialized');
      return false;
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - options.timestamp);
    if (timeDiff > 5 * 60 * 1000) {
      console.error('Request timestamp outside acceptable window');
      return false;
    }

    // Regenerate signature and compare
    const expectedSignature = this.generateSignature(options);
    return signature === expectedSignature;
  }

  getSigningHeaders(signatureData: {
    signature: string;
    timestamp: number;
    nonce: string;
  }): Record<string, string> {
    return {
      'X-Signature': signatureData.signature,
      'X-Timestamp': signatureData.timestamp.toString(),
      'X-Nonce': signatureData.nonce,
      'X-Client-Id': Config.CLIENT_ID || 'lazylearner-app',
    };
  }
}

export const requestSigning = RequestSigningService.getInstance();
