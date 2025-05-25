import { featureFlagService, FeatureFlags } from '../featureFlags';

// Mock storage dependency
jest.mock('../storage', () => ({
  encryptedStorage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock fetch globally
(globalThis as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ flags: {} }),
  })
) as jest.Mock;

describe('FeatureFlagService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    featureFlagService.clearOverrides();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await expect(featureFlagService.initialize()).resolves.not.toThrow();
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        enableRemoteConfig: false,
        enableCache: false,
        defaultFlags: {
          [FeatureFlags.ENABLE_DEBUG_MODE]: true,
        },
      };

      await expect(featureFlagService.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('flag checking', () => {
    beforeEach(async () => {
      await featureFlagService.initialize({
        enableRemoteConfig: false,
        defaultFlags: {
          [FeatureFlags.ENABLE_DEBUG_MODE]: true,
          [FeatureFlags.ENABLE_ANALYTICS]: false,
        },
      });
    });

    it('should return default flag values', async () => {
      const debugEnabled = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);
      const analyticsEnabled = await featureFlagService.isEnabled(FeatureFlags.ENABLE_ANALYTICS);

      expect(debugEnabled).toBe(true);
      expect(analyticsEnabled).toBe(false);
    });

    it('should return false for unknown flags', async () => {
      const unknownFlag = await featureFlagService.isEnabled('unknown_flag' as any);
      expect(unknownFlag).toBe(false);
    });
  });

  describe('overrides', () => {
    beforeEach(async () => {
      await featureFlagService.initialize({
        enableRemoteConfig: false,
        defaultFlags: {
          [FeatureFlags.ENABLE_DEBUG_MODE]: false,
        },
      });
    });

    it('should allow setting overrides', async () => {
      featureFlagService.setOverride(FeatureFlags.ENABLE_DEBUG_MODE, true);

      const isEnabled = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);
      expect(isEnabled).toBe(true);
    });

    it('should clear all overrides', async () => {
      featureFlagService.setOverride(FeatureFlags.ENABLE_DEBUG_MODE, true);
      featureFlagService.clearOverrides();

      const isEnabled = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);
      expect(isEnabled).toBe(false); // Should return to default
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', async () => {
      await featureFlagService.initialize({
        enableRemoteConfig: false,
        defaultFlags: {
          [FeatureFlags.ENABLE_DEBUG_MODE]: true,
          [FeatureFlags.ENABLE_ANALYTICS]: false,
        },
      });

      const allFlags = await featureFlagService.getAllFlags();

      expect(allFlags).toHaveProperty(FeatureFlags.ENABLE_DEBUG_MODE);
      expect(allFlags).toHaveProperty(FeatureFlags.ENABLE_ANALYTICS);
    });
  });

  describe('Feature flag constants', () => {
    it('should have all expected feature flags defined', () => {
      // Security flags
      expect(FeatureFlags.ENABLE_BIOMETRIC_AUTH).toBe('enable_biometric_auth');
      expect(FeatureFlags.ENABLE_CERTIFICATE_PINNING).toBe('enable_certificate_pinning');
      expect(FeatureFlags.ENABLE_REQUEST_SIGNING).toBe('enable_request_signing');
      expect(FeatureFlags.ENABLE_ENCRYPTION).toBe('enable_encryption');
      expect(FeatureFlags.ENABLE_JAILBREAK_DETECTION).toBe('enable_jailbreak_detection');

      // API flags
      expect(FeatureFlags.ENABLE_RATE_LIMITING).toBe('enable_rate_limiting');
      expect(FeatureFlags.ENABLE_REQUEST_RETRY).toBe('enable_request_retry');
      expect(FeatureFlags.ENABLE_OFFLINE_MODE).toBe('enable_offline_mode');

      // Monitoring flags
      expect(FeatureFlags.ENABLE_SENTRY).toBe('enable_sentry');
      expect(FeatureFlags.ENABLE_CRASHLYTICS).toBe('enable_crashlytics');
      expect(FeatureFlags.ENABLE_ANALYTICS).toBe('enable_analytics');

      // Development flags
      expect(FeatureFlags.ENABLE_DEBUG_MODE).toBe('enable_debug_mode');
      expect(FeatureFlags.SHOW_DEVELOPER_MENU).toBe('show_developer_menu');

      // Feature rollout flags
      expect(FeatureFlags.ENABLE_NEW_ONBOARDING).toBe('enable_new_onboarding');
      expect(FeatureFlags.ENABLE_SOCIAL_LOGIN).toBe('enable_social_login');
      expect(FeatureFlags.ENABLE_PUSH_NOTIFICATIONS).toBe('enable_push_notifications');
    });
  });
});
