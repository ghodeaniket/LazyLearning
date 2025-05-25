import { encryptedStorage } from './encryptedStorage';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    enabled: boolean;
    dailyReminders: boolean;
    achievementAlerts: boolean;
    soundEnabled: boolean;
  };
  privacy: {
    shareProgress: boolean;
    showProfile: boolean;
    allowAnalytics: boolean;
  };
  gameplay: {
    difficulty: 'easy' | 'medium' | 'hard';
    autoSave: boolean;
    hints: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
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
};

export class SecurePreferences {
  private static instance: SecurePreferences;
  private readonly PREFERENCES_KEY = 'user_preferences';
  private cache?: UserPreferences;

  private constructor() {}

  static getInstance(): SecurePreferences {
    if (!SecurePreferences.instance) {
      SecurePreferences.instance = new SecurePreferences();
    }
    return SecurePreferences.instance;
  }

  async getPreferences(): Promise<UserPreferences> {
    if (this.cache) {
      return this.cache;
    }

    const stored = await encryptedStorage.get<UserPreferences>(
      this.PREFERENCES_KEY,
      { encrypted: true },
    );

    this.cache = stored || DEFAULT_PREFERENCES;
    return this.cache;
  }

  async updatePreferences(
    updates: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = this.deepMerge(current, updates);

    await encryptedStorage.set(
      this.PREFERENCES_KEY,
      updated,
      { encrypted: true },
    );

    this.cache = updated;
    return updated;
  }

  async resetPreferences(): Promise<void> {
    await encryptedStorage.remove(
      this.PREFERENCES_KEY,
      { encrypted: true },
    );
    this.cache = undefined;
  }

  async updateTheme(theme: UserPreferences['theme']): Promise<void> {
    await this.updatePreferences({ theme });
  }

  async updateLanguage(language: string): Promise<void> {
    await this.updatePreferences({ language });
  }

  async updateNotificationSettings(
    settings: Partial<UserPreferences['notifications']>,
  ): Promise<void> {
    const current = await this.getPreferences();
    await this.updatePreferences({
      notifications: { ...current.notifications, ...settings },
    });
  }

  async updatePrivacySettings(
    settings: Partial<UserPreferences['privacy']>,
  ): Promise<void> {
    const current = await this.getPreferences();
    await this.updatePreferences({
      privacy: { ...current.privacy, ...settings },
    });
  }

  async updateGameplaySettings(
    settings: Partial<UserPreferences['gameplay']>,
  ): Promise<void> {
    const current = await this.getPreferences();
    await this.updatePreferences({
      gameplay: { ...current.gameplay, ...settings },
    });
  }

  private deepMerge<T extends Record<string, any>>(
    target: T,
    source: Partial<T>,
  ): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }
}

export const securePreferences = SecurePreferences.getInstance();
