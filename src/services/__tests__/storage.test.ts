import { encryptedStorage, securePreferences } from '../storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'react-native-crypto-js';
import Keychain from 'react-native-keychain';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-crypto-js');
jest.mock('react-native-keychain');

describe('Encrypted Storage', () => {
  const mockEncryptionKey = 'test-encryption-key';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Keychain
    (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
      username: 'encryption_key',
      password: mockEncryptionKey,
    });

    (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

    // Mock CryptoJS
    (CryptoJS.AES.encrypt as jest.Mock).mockReturnValue({
      toString: () => 'encrypted-data',
    });

    (CryptoJS.AES.decrypt as jest.Mock).mockReturnValue({
      toString: () => JSON.stringify({
        data: 'test-value',
        timestamp: Date.now(),
      }),
    });
  });

  describe('initialize', () => {
    it('should generate encryption key if not exists', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValueOnce(
        false,
      );

      (CryptoJS.lib.WordArray.random as jest.Mock).mockReturnValue({
        toString: () => 'new-encryption-key',
      });

      await encryptedStorage.initialize();

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'com.lazylearner.storage',
        'encryption_key',
        'new-encryption-key',
      );
    });

    it('should use existing encryption key', async () => {
      await encryptedStorage.initialize();

      expect(Keychain.setInternetCredentials).not.toHaveBeenCalled();
    });
  });

  describe('set and get', () => {
    beforeEach(async () => {
      await encryptedStorage.initialize();
    });

    it('should encrypt and store data', async () => {
      const testData = { foo: 'bar', nested: { value: 123 } };

      await encryptedStorage.set('test-key', testData);

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'encrypted_test-key',
        'encrypted-data',
      );
    });

    it('should retrieve and decrypt data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('encrypted-data');

      const result = await encryptedStorage.get('test-key');

      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        mockEncryptionKey,
      );
      expect(result).toBe('test-value');
    });

    it('should handle expiration', async () => {
      const expiredData = JSON.stringify({
        data: 'expired-value',
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
      });

      (CryptoJS.AES.decrypt as jest.Mock).mockReturnValueOnce({
        toString: () => expiredData,
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('encrypted-data');

      const result = await encryptedStorage.get('test-key');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        'encrypted_test-key',
      );
    });

    it('should store unencrypted data when specified', async () => {
      await encryptedStorage.set('plain-key', 'plain-value', {
        encrypted: false,
      });

      expect(CryptoJS.AES.encrypt).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'plain-key',
        expect.stringContaining('plain-value'),
      );
    });
  });

  describe('multi operations', () => {
    beforeEach(async () => {
      await encryptedStorage.initialize();
    });

    it('should handle multiGet', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('encrypted-data-1')
        .mockResolvedValueOnce('encrypted-data-2');

      (CryptoJS.AES.decrypt as jest.Mock)
        .mockReturnValueOnce({
          toString: () => JSON.stringify({
            data: 'value-1',
            timestamp: Date.now(),
          }),
        })
        .mockReturnValueOnce({
          toString: () => JSON.stringify({
            data: 'value-2',
            timestamp: Date.now(),
          }),
        });

      const results = await encryptedStorage.multiGet(['key1', 'key2']);

      expect(results.get('key1')).toBe('value-1');
      expect(results.get('key2')).toBe('value-2');
    });

    it('should handle multiSet', async () => {
      await encryptedStorage.multiSet([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Secure Preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton cache
    (securePreferences as any).cache = undefined;
  });

  it('should return default preferences when none stored', async () => {
    jest.spyOn(encryptedStorage, 'get').mockResolvedValue(null);

    const prefs = await securePreferences.getPreferences();

    expect(prefs).toEqual({
      theme: 'system',
      language: 'en',
      notifications: {
        enabled: true,
        dailyReminders: true,
        achievementAlerts: true,
        soundEnabled: true,
      },
      privacy: {
        shareProgress: false,
        showProfile: true,
        allowAnalytics: true,
      },
      gameplay: {
        difficulty: 'medium',
        autoSave: true,
        hints: true,
      },
    });
  });

  it('should update preferences', async () => {
    jest.spyOn(encryptedStorage, 'get').mockResolvedValue({
      theme: 'light',
      language: 'en',
      notifications: {
        enabled: true,
        dailyReminders: true,
        achievementAlerts: true,
        soundEnabled: true,
      },
      privacy: {
        shareProgress: false,
        showProfile: true,
        allowAnalytics: true,
      },
      gameplay: {
        difficulty: 'medium',
        autoSave: true,
        hints: true,
      },
    });

    const setSpy = jest.spyOn(encryptedStorage, 'set').mockResolvedValue();

    const updated = await securePreferences.updatePreferences({
      theme: 'dark',
      notifications: {
        enabled: true,
        dailyReminders: true,
        achievementAlerts: true,
        soundEnabled: false,
      },
    });

    expect(updated.theme).toBe('dark');
    expect(updated.notifications.soundEnabled).toBe(false);
    expect(updated.notifications.enabled).toBe(true);

    expect(setSpy).toHaveBeenCalledWith(
      'user_preferences',
      expect.objectContaining({ theme: 'dark' }),
      { encrypted: true },
    );
  });

  it('should update specific settings', async () => {
    jest.spyOn(encryptedStorage, 'get').mockResolvedValue(null);
    const setSpy = jest.spyOn(encryptedStorage, 'set').mockResolvedValue();

    await securePreferences.updateTheme('dark');
    await securePreferences.updateLanguage('es');
    await securePreferences.updateNotificationSettings({
      dailyReminders: false,
    });

    expect(setSpy).toHaveBeenCalledTimes(3);
  });

  it('should reset preferences', async () => {
    const removeSpy = jest
      .spyOn(encryptedStorage, 'remove')
      .mockResolvedValue();

    await securePreferences.resetPreferences();

    expect(removeSpy).toHaveBeenCalledWith(
      'user_preferences',
      { encrypted: true },
    );
  });
});
