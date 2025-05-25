import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import CryptoJS from 'react-native-crypto-js';
import { encryptedStorage } from '../storage';
import NetInfo from '@react-native-community/netinfo';

export interface DeviceFingerprint {
  id: string;
  platform: string;
  deviceId: string;
  brand: string;
  model: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  isTablet: boolean;
  hasNotch: boolean;
  deviceType: string;
  timestamp: number;
}

export class DeviceFingerprintService {
  private static instance: DeviceFingerprintService;
  private readonly FINGERPRINT_KEY = 'device_fingerprint';
  private cachedFingerprint?: DeviceFingerprint;

  private constructor() {}

  static getInstance(): DeviceFingerprintService {
    if (!DeviceFingerprintService.instance) {
      DeviceFingerprintService.instance = new DeviceFingerprintService();
    }
    return DeviceFingerprintService.instance;
  }

  async getFingerprint(): Promise<DeviceFingerprint> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    // Try to get stored fingerprint
    const stored = await encryptedStorage.get<DeviceFingerprint>(
      this.FINGERPRINT_KEY,
    );

    if (stored && this.isFingerprintValid(stored)) {
      this.cachedFingerprint = stored;
      return stored;
    }

    // Generate new fingerprint
    const fingerprint = await this.generateFingerprint();
    await this.storeFingerprint(fingerprint);
    this.cachedFingerprint = fingerprint;
    return fingerprint;
  }

  private async generateFingerprint(): Promise<DeviceFingerprint> {
    const [uniqueId, deviceId] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceId(),
    ]);

    // Collect device information
    const deviceData = {
      platform: Platform.OS,
      deviceId,
      brand: await DeviceInfo.getBrand(),
      model: await DeviceInfo.getModel(),
      systemVersion: await DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      isTablet: await DeviceInfo.isTablet(),
      hasNotch: await DeviceInfo.hasNotch(),
      deviceType: await DeviceInfo.getDeviceType(),
      uniqueId,
      // Additional entropy sources
      timezone: new Date().getTimezoneOffset(),
      locale: await DeviceInfo.getDeviceLocale(),
      carrier: await DeviceInfo.getCarrier(),
    };

    // Generate stable fingerprint ID
    const fingerprintId = this.generateFingerprintId(deviceData);

    const fingerprint: DeviceFingerprint = {
      id: fingerprintId,
      platform: deviceData.platform,
      deviceId: deviceData.deviceId,
      brand: deviceData.brand,
      model: deviceData.model,
      systemVersion: deviceData.systemVersion,
      appVersion: deviceData.appVersion,
      buildNumber: deviceData.buildNumber,
      isTablet: deviceData.isTablet,
      hasNotch: deviceData.hasNotch,
      deviceType: deviceData.deviceType,
      timestamp: Date.now(),
    };

    return fingerprint;
  }

  private generateFingerprintId(data: Record<string, any>): string {
    // Create stable fingerprint from device characteristics
    const stableData = [
      data.platform,
      data.deviceId,
      data.brand,
      data.model,
      data.uniqueId,
    ].join('|');

    return CryptoJS.SHA256(stableData).toString();
  }

  private async storeFingerprint(fingerprint: DeviceFingerprint): Promise<void> {
    await encryptedStorage.set(this.FINGERPRINT_KEY, fingerprint, {
      encrypted: true,
    });
  }

  private isFingerprintValid(fingerprint: DeviceFingerprint): boolean {
    // Check if fingerprint is recent (within 30 days)
    const age = Date.now() - fingerprint.timestamp;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return age < thirtyDays;
  }

  async getFingerprintHeaders(): Promise<Record<string, string>> {
    const fingerprint = await this.getFingerprint();
    return {
      'X-Device-Id': fingerprint.id,
      'X-Device-Platform': fingerprint.platform,
      'X-Device-Model': `${fingerprint.brand} ${fingerprint.model}`,
      'X-App-Version': fingerprint.appVersion,
    };
  }

  async getDeviceInfo(): Promise<{
    network: string;
    ipAddress: string | null;
    isEmulator: boolean;
    isPinOrFingerprintSet: boolean;
    batteryLevel: number;
    isCharging: boolean;
  }> {
    const [netInfo, batteryLevel, isEmulator, isPinOrFingerprintSet] = await Promise.all([
      NetInfo.fetch(),
      DeviceInfo.getBatteryLevel(),
      DeviceInfo.isEmulator(),
      DeviceInfo.isPinOrFingerprintSet(),
    ]);

    return {
      network: netInfo.type,
      ipAddress: (netInfo.details as any)?.ipAddress || null,
      isEmulator,
      isPinOrFingerprintSet,
      batteryLevel,
      isCharging: await DeviceInfo.isBatteryCharging(),
    };
  }

  async validateDevice(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const deviceInfo = await this.getDeviceInfo();

    // Check for emulator
    if (deviceInfo.isEmulator && !__DEV__) {
      issues.push('Running on emulator');
    }

    // Check for network
    if (deviceInfo.network === 'none') {
      issues.push('No network connection');
    }

    // Check battery level
    if (deviceInfo.batteryLevel < 0.1 && !deviceInfo.isCharging) {
      issues.push('Low battery');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  async hasDeviceChanged(): Promise<boolean> {
    const stored = await encryptedStorage.get<DeviceFingerprint>(
      this.FINGERPRINT_KEY,
    );

    if (!stored) {
      return false;
    }

    const current = await this.generateFingerprint();

    // Check if key characteristics have changed
    return (
      stored.deviceId !== current.deviceId ||
      stored.model !== current.model ||
      stored.brand !== current.brand
    );
  }
}

export const deviceFingerprint = DeviceFingerprintService.getInstance();
