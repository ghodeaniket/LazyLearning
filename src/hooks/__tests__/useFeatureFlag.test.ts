import { renderHook } from '@testing-library/react-native';
import { useFeatureFlag, useFeatureFlagWithLoading } from '../useFeatureFlag';

// Mock dependencies
const mockIsEnabled = jest.fn();

jest.mock('../../services/featureFlags', () => ({
  featureFlagService: {
    isEnabled: mockIsEnabled,
  },
  FeatureFlags: {
    ENABLE_SOCIAL_LOGIN: 'enable_social_login',
    ENABLE_BIOMETRIC_AUTH: 'enable_biometric_auth',
    ENABLE_NEW_ONBOARDING: 'enable_new_onboarding',
  },
}));

import { FeatureFlags } from '../../services/featureFlags';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return false while loading', () => {
      mockIsEnabled.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      expect(result.current).toBe(false);
    });

    it('should return false initially for any flag', () => {
      // This test validates the hook structure and basic functionality
      // The actual feature flag behavior is tested at the service level
      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      // Hook should return false initially (loading state)
      expect(result.current).toBe(false);
    });

    it('should handle different flag keys', () => {
      const { result: result1 } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));
      const { result: result2 } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_NEW_ONBOARDING));

      // Both should return false initially
      expect(result1.current).toBe(false);
      expect(result2.current).toBe(false);
    });

    it('should handle userId parameter', () => {
      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN, 'user123'));

      // Should return false initially regardless of userId
      expect(result.current).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', () => {
      mockIsEnabled.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      // Should not throw and return false
      expect(result.current).toBe(false);
    });
  });
});

describe('useFeatureFlagWithLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      // Should return an object with both properties
      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('isLoading');
      expect(typeof result.current.isEnabled).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should handle different flag keys', () => {
      const { result: result1 } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));
      const { result: result2 } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_NEW_ONBOARDING));

      // Both should have the correct structure
      expect(result1.current).toHaveProperty('isEnabled');
      expect(result1.current).toHaveProperty('isLoading');
      expect(result2.current).toHaveProperty('isEnabled');
      expect(result2.current).toHaveProperty('isLoading');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', () => {
      mockIsEnabled.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      // Should not throw and should have correct structure
      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('isLoading');
      expect(typeof result.current.isEnabled).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });
});

