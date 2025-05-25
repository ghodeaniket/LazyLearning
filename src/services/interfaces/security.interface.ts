export interface IEncryptionService {
  initialize(): Promise<void>;
  encryptRequest(data: any): Promise<string>;
  decryptResponse(data: string): Promise<any>;
  encryptSensitiveFields(data: Record<string, any>, fields: string[]): Promise<Record<string, any>>;
  decryptSensitiveFields(data: Record<string, any>, fields: string[]): Promise<Record<string, any>>;
  hashData(data: string, salt?: string): string;
  verifyHash(data: string, hashedValue: string): boolean;
}

export interface IRequestSigningService {
  initialize(): Promise<void>;
  signRequest(options: SignatureOptions): Promise<SignatureData>;
  verifySignature(signature: string, options: SignatureOptions): boolean;
  getSigningHeaders(signatureData: SignatureData): Record<string, string>;
}

export interface SignatureOptions {
  method: string;
  url: string;
  body?: string;
  timestamp?: number;
  nonce?: string;
}

export interface SignatureData {
  signature: string;
  timestamp: number;
  nonce: string;
}

export interface ISessionManager {
  startSession(userId: string): Promise<Session>;
  endSession(reason?: string): Promise<void>;
  getSession(): Promise<Session | null>;
  updateActivity(): Promise<void>;
  validateSession(): Promise<boolean>;
  getCsrfToken(): Promise<string | null>;
  validateCsrfToken(token: string): Promise<boolean>;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  startTime: number;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
  csrfToken?: string;
}

export interface IBiometricAuth {
  isAvailable(): Promise<boolean>;
  authenticate(reason?: string): Promise<boolean>;
  getSupportedTypes(): Promise<string[]>;
}

export interface IDeviceSecurityService {
  performSecurityCheck(): Promise<DeviceSecurityStatus>;
  isJailbroken(): Promise<boolean>;
  isRooted(): Promise<boolean>;
  getDeviceFingerprint(): Promise<DeviceFingerprint>;
}

export interface DeviceSecurityStatus {
  isJailbroken: boolean;
  isRooted: boolean;
  isEmulator: boolean;
  isDebuggingEnabled: boolean;
  details: string[];
}

export interface DeviceFingerprint {
  id: string;
  platform: string;
  model: string;
  version: string;
  uniqueId: string;
}
