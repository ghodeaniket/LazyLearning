export interface StorageOptions {
  encrypted?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface IStorageService {
  set<T>(key: string, value: T, options?: StorageOptions): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface ISecureStorage extends IStorageService {
  setEncryptionKey(key: string): Promise<void>;
  rotateEncryptionKey(): Promise<void>;
}
