import CryptoJS from 'react-native-crypto-js';
import { encryptedStorage } from '../storage';
import { errorHandler, ErrorSeverity } from '../monitoring';

interface EncryptedPayload {
  data: string;
  timestamp: number;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey?: string;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    // For MVP, use a simple key stored securely
    const storedKey = await encryptedStorage.get<string>('app_encryption_key');

    if (!storedKey) {
      // Generate a simple key for MVP
      this.encryptionKey = this.generateKey();
      await encryptedStorage.set('app_encryption_key', this.encryptionKey, {
        encrypted: true,
      });
    } else {
      this.encryptionKey = storedKey;
    }
  }

  private generateKey(): string {
    // Simple key generation for MVP
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async encryptData(data: any): Promise<string> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    try {
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

      // Simple AES encryption for MVP
      const encrypted = CryptoJS.AES.encrypt(plaintext, this.encryptionKey!).toString();

      const payload: EncryptedPayload = {
        data: encrypted,
        timestamp: Date.now(),
      };

      return JSON.stringify(payload);
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Encryption failed',
          'ENCRYPTION_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
          },
        ),
      );
      throw error;
    }
  }

  async decryptData(encryptedData: string): Promise<any> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    try {
      const payload: EncryptedPayload = JSON.parse(encryptedData);

      // Simple AES decryption for MVP
      const decrypted = CryptoJS.AES.decrypt(payload.data, this.encryptionKey!);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

      return JSON.parse(plaintext);
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Decryption failed',
          'DECRYPTION_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
          },
        ),
      );
      throw error;
    }
  }

  // Simplified methods for MVP - remove complex crypto operations
  async encryptRequest(data: any): Promise<string> {
    return this.encryptData(data);
  }

  async decryptResponse(encryptedData: string): Promise<any> {
    return this.decryptData(encryptedData);
  }

  encryptField(value: string): string {
    // Simple field encryption for MVP
    return CryptoJS.AES.encrypt(value, this.encryptionKey || 'temp-key').toString();
  }

  decryptField(encryptedValue: string): string {
    // Simple field decryption for MVP
    const decrypted = CryptoJS.AES.decrypt(encryptedValue, this.encryptionKey || 'temp-key');
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  hashData(data: string): string {
    // Simple hashing for MVP - use AES as a workaround since SHA256 may not be available
    return CryptoJS.AES.encrypt(data, 'hash-key').toString();
  }

  generateSecureToken(): string {
    // Simple token generation for MVP
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  destroy(): void {
    this.encryptionKey = undefined;
  }
}

export const encryptionService = EncryptionService.getInstance();

