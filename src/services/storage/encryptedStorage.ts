import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'react-native-crypto-js';
import Keychain from 'react-native-keychain';
import { errorHandler, ErrorSeverity } from '../monitoring';

interface StorageOptions {
  encrypted?: boolean;
  expiresIn?: number;
}

interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export class EncryptedStorage {
  private static instance: EncryptedStorage;
  private encryptionKey?: string;
  private readonly KEY_SERVICE = 'com.lazylearner.storage';
  private readonly KEY_USERNAME = 'encryption_key';

  private constructor() {}

  static getInstance(): EncryptedStorage {
    if (!EncryptedStorage.instance) {
      EncryptedStorage.instance = new EncryptedStorage();
    }
    return EncryptedStorage.instance;
  }

  async initialize(): Promise<void> {
    try {
      const existingKey = await this.getEncryptionKey();
      if (!existingKey) {
        await this.generateEncryptionKey();
      }
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to initialize encrypted storage',
          'STORAGE_INIT_ERROR',
          {
            severity: ErrorSeverity.HIGH,
          },
        ),
      );
      throw error;
    }
  }

  private async generateEncryptionKey(): Promise<void> {
    const key = CryptoJS.lib.WordArray.random(256 / 8).toString();

    await Keychain.setInternetCredentials(
      this.KEY_SERVICE,
      this.KEY_USERNAME,
      key,
    );

    this.encryptionKey = key;
  }

  private async getEncryptionKey(): Promise<string | null> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      const credentials = await Keychain.getInternetCredentials(
        this.KEY_SERVICE,
      );

      if (credentials && credentials.username === this.KEY_USERNAME) {
        this.encryptionKey = credentials.password;
        return this.encryptionKey;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: StorageOptions = {},
  ): Promise<void> {
    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
      };

      if (options.expiresIn) {
        item.expiresAt = Date.now() + options.expiresIn;
      }

      const serialized = JSON.stringify(item);

      if (options.encrypted !== false) {
        const encryptionKey = await this.getEncryptionKey();
        if (!encryptionKey) {
          throw new Error('Encryption key not available');
        }

        const encrypted = CryptoJS.AES.encrypt(
          serialized,
          encryptionKey,
        ).toString();

        await AsyncStorage.setItem(`encrypted_${key}`, encrypted);
      } else {
        await AsyncStorage.setItem(key, serialized);
      }
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to save to storage',
          'STORAGE_SET_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
            context: { key },
          },
        ),
      );
      throw error;
    }
  }

  async get<T>(
    key: string,
    options: StorageOptions = {},
  ): Promise<T | null> {
    try {
      let serialized: string | null;

      if (options.encrypted !== false) {
        const encrypted = await AsyncStorage.getItem(`encrypted_${key}`);
        if (!encrypted) {
          return null;
        }

        const encryptionKey = await this.getEncryptionKey();
        if (!encryptionKey) {
          throw new Error('Encryption key not available');
        }

        const decrypted = CryptoJS.AES.decrypt(
          encrypted,
          encryptionKey,
        );
        serialized = decrypted.toString(CryptoJS.enc.Utf8);
      } else {
        serialized = await AsyncStorage.getItem(key);
      }

      if (!serialized) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(serialized);

      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.remove(key, options);
        return null;
      }

      return item.data;
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to retrieve from storage',
          'STORAGE_GET_ERROR',
          {
            severity: ErrorSeverity.LOW,
            context: { key },
          },
        ),
      );
      return null;
    }
  }

  async remove(
    key: string,
    options: StorageOptions = {},
  ): Promise<void> {
    try {
      if (options.encrypted !== false) {
        await AsyncStorage.removeItem(`encrypted_${key}`);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to remove from storage',
          'STORAGE_REMOVE_ERROR',
          {
            severity: ErrorSeverity.LOW,
            context: { key },
          },
        ),
      );
    }
  }

  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        k => k.startsWith('encrypted_') || !k.includes('_'),
      );
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      errorHandler.handle(
        errorHandler.createError(
          'Failed to clear storage',
          'STORAGE_CLEAR_ERROR',
          {
            severity: ErrorSeverity.MEDIUM,
          },
        ),
      );
    }
  }

  async multiGet<T>(
    keys: string[],
    options: StorageOptions = {},
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    await Promise.all(
      keys.map(async key => {
        const value = await this.get<T>(key, options);
        results.set(key, value);
      }),
    );

    return results;
  }

  async multiSet(
    items: Array<{ key: string; value: any }>,
    options: StorageOptions = {},
  ): Promise<void> {
    await Promise.all(
      items.map(item => this.set(item.key, item.value, options)),
    );
  }

  async multiRemove(
    keys: string[],
    options: StorageOptions = {},
  ): Promise<void> {
    await Promise.all(keys.map(key => this.remove(key, options)));
  }

  async getSize(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}

export const encryptedStorage = EncryptedStorage.getInstance();
