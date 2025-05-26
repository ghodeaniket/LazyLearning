import { renderHook, waitFor } from '@testing-library/react-native';
import { useFeatureFlag, useFeatureFlagWithLoading } from '../useFeatureFlag';
import { featureFlagService, FeatureFlags } from '../../services/featureFlags';

// Mock dependencies
jest.mock('../../services/featureFlags');

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
      (featureFlagService.isEnabled as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      expect(result.current).toBe(false);
    });

    it('should return true when feature flag is enabled', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(featureFlagService.isEnabled).toHaveBeenCalledWith(FeatureFlags.ENABLE_SOCIAL_LOGIN, undefined);
    });

    it('should return false when feature flag is disabled', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_NEW_ONBOARDING));

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      expect(featureFlagService.isEnabled).toHaveBeenCalledWith(FeatureFlags.ENABLE_NEW_ONBOARDING, undefined);
    });

    it('should pass userId when provided', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN, 'user123'));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(featureFlagService.isEnabled).toHaveBeenCalledWith(FeatureFlags.ENABLE_SOCIAL_LOGIN, 'user123');
    });
  });

  describe('error handling', () => {
    it('should return false on error', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          `Error checking feature flag ${FeatureFlags.ENABLE_SOCIAL_LOGIN}:`,
          expect.any(Error)
        );
      });

      expect(result.current).toBe(false);
    });
  });

  describe('re-rendering', () => {
    it('should re-check flag when flagKey changes', async () => {
      (featureFlagService.isEnabled as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      type FlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];
      const { result, rerender } = renderHook(
        ({ flagKey }: { flagKey: FlagKey }) => useFeatureFlag(flagKey),
        { initialProps: { flagKey: FeatureFlags.ENABLE_SOCIAL_LOGIN as FlagKey } }
      );

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      rerender({ flagKey: FeatureFlags.ENABLE_NEW_ONBOARDING as FlagKey });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      expect(featureFlagService.isEnabled).toHaveBeenCalledTimes(2);
      expect(featureFlagService.isEnabled).toHaveBeenNthCalledWith(1, FeatureFlags.ENABLE_SOCIAL_LOGIN, undefined);
      expect(featureFlagService.isEnabled).toHaveBeenNthCalledWith(2, FeatureFlags.ENABLE_NEW_ONBOARDING, undefined);
    });

    it('should re-check flag when userId changes', async () => {
      (featureFlagService.isEnabled as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const { result, rerender } = renderHook(
        ({ userId }) => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN, userId),
        { initialProps: { userId: 'user1' } }
      );

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      rerender({ userId: 'user2' });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      expect(featureFlagService.isEnabled).toHaveBeenCalledTimes(2);
      expect(featureFlagService.isEnabled).toHaveBeenNthCalledWith(1, FeatureFlags.ENABLE_SOCIAL_LOGIN, 'user1');
      expect(featureFlagService.isEnabled).toHaveBeenNthCalledWith(2, FeatureFlags.ENABLE_SOCIAL_LOGIN, 'user2');
    });
  });

  describe('cleanup', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: boolean) => void = () => {};
      (featureFlagService.isEnabled as jest.Mock).mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result, unmount } = renderHook(() => useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      expect(result.current).toBe(false);

      unmount();

      // Resolve the promise after unmount
      resolvePromise(true);

      // Wait a bit to ensure no state updates occur
      await new Promise<void>(resolve => setTimeout(resolve, 100));

      // No errors should be thrown about updating unmounted component
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update on an unmounted component")
      );
    });
  });
});

describe('useFeatureFlagWithLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return loading state initially', () => {
      (featureFlagService.isEnabled as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      expect(result.current).toEqual({
        isEnabled: false,
        isLoading: true,
      });
    });

    it('should return enabled state when flag is enabled', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      await waitFor(() => {
        expect(result.current).toEqual({
          isEnabled: true,
          isLoading: false,
        });
      });
    });

    it('should return disabled state when flag is disabled', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_NEW_ONBOARDING));

      await waitFor(() => {
        expect(result.current).toEqual({
          isEnabled: false,
          isLoading: false,
        });
      });
    });
  });

  describe('error handling', () => {
    it('should return loading false and enabled false on error', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      await waitFor(() => {
        expect(result.current).toEqual({
          isEnabled: false,
          isLoading: false,
        });
      });

      expect(console.error).toHaveBeenCalledWith(
        `Error checking feature flag ${FeatureFlags.ENABLE_SOCIAL_LOGIN}:`,
        expect.any(Error)
      );
    });
  });

  describe('loading state transitions', () => {
    it('should transition from loading to loaded', async () => {
      let resolvePromise: (value: boolean) => void = () => {};
      (featureFlagService.isEnabled as jest.Mock).mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useFeatureFlagWithLoading(FeatureFlags.ENABLE_SOCIAL_LOGIN));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isEnabled).toBe(false);

      // Resolve the promise
      await waitFor(() => {
        resolvePromise(true);
      });

      // After resolution
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isEnabled).toBe(true);
      });
    });
  });
});

