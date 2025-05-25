import CryptoJS from 'react-native-crypto-js';
import { encryptedStorage } from '../storage';
import { errorHandler, ErrorSeverity } from '../monitoring';

interface EncryptedPayload {
  data: string;
  iv: string;
  salt: string;
  timestamp: number;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly ENCRYPTION_KEY_NAME = 'transport_encryption_key';
  private encryptionKey?: string;
  private readonly keyDerivationIterations = 10000;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    const storedKey = await encryptedStorage.get<string>(this.ENCRYPTION_KEY_NAME);

    if (!storedKey) {
      // Generate new encryption key
      this.encryptionKey = this.generateKey();
      await encryptedStorage.set(this.ENCRYPTION_KEY_NAME, this.encryptionKey, {
        encrypted: true,
      });
    } else {
      this.encryptionKey = storedKey;
    }
  }

  private generateKey(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  async encryptRequest(data: any): Promise<string> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    try {
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate random IV and salt
      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const salt = CryptoJS.lib.WordArray.random(128 / 8);

      // Derive key from master key and salt
      const derivedKey = CryptoJS.PBKDF2(
        this.encryptionKey!,
        salt,
        {
          keySize: 256 / 32,
          iterations: this.keyDerivationIterations,
        },
      );

      // Encrypt data
      const encrypted = CryptoJS.AES.encrypt(plaintext, derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Create payload
      const payload: EncryptedPayload = {
        data: encrypted.toString(),
        iv: iv.toString(),
        salt: salt.toString(),
        timestamp: Date.now(),
      };

      // Return base64 encoded payload
      return Buffer.from(JSON.stringify(payload)).toString('base64');
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to encrypt request',
          'ENCRYPTION_ERROR',
          {
            severity: ErrorSeverity.HIGH,
            context: { error: error instanceof Error ? error.message : 'Unknown' },
          },
        ),
      );
      throw error;
    }
  }

  async decryptResponse(encryptedData: string): Promise<any> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    try {
      // Decode base64 payload
      const payloadString = Buffer.from(encryptedData, 'base64').toString();
      const payload: EncryptedPayload = JSON.parse(payloadString);

      // Check timestamp (prevent replay attacks)
      const age = Date.now() - payload.timestamp;
      if (age > 5 * 60 * 1000) { // 5 minutes
        throw new Error('Encrypted payload too old');
      }

      // Restore IV and salt
      const iv = CryptoJS.enc.Hex.parse(payload.iv);
      const salt = CryptoJS.enc.Hex.parse(payload.salt);

      // Derive key
      const derivedKey = CryptoJS.PBKDF2(
        this.encryptionKey!,
        salt,
        {
          keySize: 256 / 32,
          iterations: this.keyDerivationIterations,
        },
      );

      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(payload.data, derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

      // Try to parse as JSON
      try {
        return JSON.parse(plaintext);
      } catch {
        return plaintext;
      }
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to decrypt response',
          'DECRYPTION_ERROR',
          {
            severity: ErrorSeverity.HIGH,
            context: { error: error instanceof Error ? error.message : 'Unknown' },
          },
        ),
      );
      throw error;
    }
  }

  // Encrypt sensitive fields in an object
  async encryptSensitiveFields<T extends Record<string, any>>(
    data: T,
    sensitiveFields: (keyof T)[],
  ): Promise<T> {
    const result = { ...data };

    for (const field of sensitiveFields) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = await this.encryptRequest(result[field]) as T[keyof T];
      }
    }

    return result;
  }

  // Decrypt sensitive fields in an object
  async decryptSensitiveFields<T extends Record<string, any>>(
    data: T,
    sensitiveFields: (keyof T)[],
  ): Promise<T> {
    const result = { ...data };

    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = await this.decryptResponse(result[field] as string) as T[keyof T];
        } catch {
          // Field might not be encrypted, leave as is
        }
      }
    }

    return result;
  }

  // Generate a secure random token
  generateSecureToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  // Hash sensitive data (one-way)
  hashData(data: string, salt?: string): string {
    const actualSalt = salt || CryptoJS.lib.WordArray.random(128 / 8).toString();
    const hash = CryptoJS.PBKDF2(data, actualSalt, {
      keySize: 256 / 32,
      iterations: 1000,
    }).toString();

    return `${actualSalt}:${hash}`;
  }

  // Verify hashed data
  verifyHash(data: string, hashedValue: string): boolean {
    const [salt, hash] = hashedValue.split(':');
    if (!salt || !hash) {return false;}

    const computedHash = CryptoJS.PBKDF2(data, salt, {
      keySize: 256 / 32,
      iterations: 1000,
    }).toString();

    return hash === computedHash;
  }
}

export const encryptionService = EncryptionService.getInstance();
