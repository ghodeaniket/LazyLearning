import { renderHook } from '@testing-library/react-native';
import { useFeatureFlag } from '../useFeatureFlag';
import { featureFlagService } from '../../services/featureFlags';

// Mock the feature flag service
jest.mock('../../services/featureFlags');

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    (featureFlagService.isEnabled as jest.Mock).mockReturnValue(false);
    (featureFlagService.subscribe as jest.Mock).mockReturnValue(jest.fn());
  });

  describe('initial state', () => {
    it('should return initial flag value', () => {
      (featureFlagService.isEnabled as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlag('testFeature'));

      expect(result.current).toBe(true);
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('testFeature');
    });

    it('should return false when flag is disabled', () => {
      (featureFlagService.isEnabled as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlag('disabledFeature'));

      expect(result.current).toBe(false);
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('disabledFeature');
    });
  });

  describe('subscription', () => {
    it('should subscribe to flag changes on mount', () => {
      const mockUnsubscribe = jest.fn();
      (featureFlagService.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useFeatureFlag('testFeature'));

      expect(featureFlagService.subscribe).toHaveBeenCalledWith(
        'testFeature',
        expect.any(Function)
      );

      // Should not unsubscribe yet
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Unmount should trigger unsubscribe
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update value when flag changes', () => {
      let flagChangeCallback: ((value: boolean) => void) | null = null;

      (featureFlagService.subscribe as jest.Mock).mockImplementation((flag, callback) => {
        flagChangeCallback = callback;
        return jest.fn();
      });

      const { result, rerender } = renderHook(() => useFeatureFlag('dynamicFeature'));

      expect(result.current).toBe(false); // Initial value

      // Simulate flag change
      (featureFlagService.isEnabled as jest.Mock).mockReturnValue(true);
      if (flagChangeCallback) {
        flagChangeCallback(true);
      }

      rerender();
      expect(result.current).toBe(true);
    });

    it('should handle multiple flag changes', () => {
      let flagChangeCallback: ((value: boolean) => void) | null = null;

      (featureFlagService.subscribe as jest.Mock).mockImplementation((flag, callback) => {
        flagChangeCallback = callback;
        return jest.fn();
      });

      const { result, rerender } = renderHook(() => useFeatureFlag('toggleFeature'));

      // Initial state
      expect(result.current).toBe(false);

      // First change - enable
      if (flagChangeCallback) {
        flagChangeCallback(true);
      }
      rerender();
      expect(result.current).toBe(true);

      // Second change - disable
      if (flagChangeCallback) {
        flagChangeCallback(false);
      }
      rerender();
      expect(result.current).toBe(false);

      // Third change - enable again
      if (flagChangeCallback) {
        flagChangeCallback(true);
      }
      rerender();
      expect(result.current).toBe(true);
    });
  });

  describe('hook lifecycle', () => {
    it('should resubscribe when flag name changes', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();

      (featureFlagService.subscribe as jest.Mock)
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      const { rerender } = renderHook(
        ({ flag }) => useFeatureFlag(flag),
        { initialProps: { flag: 'feature1' } }
      );

      expect(featureFlagService.subscribe).toHaveBeenCalledWith(
        'feature1',
        expect.any(Function)
      );
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('feature1');

      // Change flag name
      rerender({ flag: 'feature2' });

      // Should unsubscribe from old flag
      expect(mockUnsubscribe1).toHaveBeenCalled();

      // Should subscribe to new flag
      expect(featureFlagService.subscribe).toHaveBeenCalledWith(
        'feature2',
        expect.any(Function)
      );
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('feature2');
    });

    it('should not resubscribe when flag name remains the same', () => {
      const mockUnsubscribe = jest.fn();
      (featureFlagService.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(() => useFeatureFlag('constantFeature'));

      expect(featureFlagService.subscribe).toHaveBeenCalledTimes(1);

      // Rerender with same flag
      rerender();

      // Should not subscribe again
      expect(featureFlagService.subscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined flag names', () => {
      const { result } = renderHook(() => useFeatureFlag(undefined as any));

      expect(result.current).toBe(false);
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith(undefined);
    });

    it('should handle empty string flag names', () => {
      const { result } = renderHook(() => useFeatureFlag(''));

      expect(result.current).toBe(false);
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('');
    });

    it('should handle service errors gracefully', () => {
      (featureFlagService.isEnabled as jest.Mock).mockImplementation(() => {
        throw new Error('Service error');
      });

      // Should not throw
      const { result } = renderHook(() => useFeatureFlag('errorFeature'));

      // Should default to false on error
      expect(result.current).toBe(false);
    });

    it('should handle subscription errors gracefully', () => {
      (featureFlagService.subscribe as jest.Mock).mockImplementation(() => {
        throw new Error('Subscription error');
      });

      // Should not throw during render
      expect(() => {
        renderHook(() => useFeatureFlag('subscriptionError'));
      }).not.toThrow();
    });
  });

  describe('common feature flags', () => {
    it('should handle biometric authentication flag', () => {
      (featureFlagService.isEnabled as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlag('biometric_auth'));

      expect(result.current).toBe(true);
    });

    it('should handle advanced game modes flag', () => {
      (featureFlagService.isEnabled as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlag('advanced_game_modes'));

      expect(result.current).toBe(false);
    });

    it('should handle offline mode flag', () => {
      (featureFlagService.isEnabled as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlag('offline_mode'));

      expect(result.current).toBe(true);
    });
  });

  describe('performance', () => {
    it('should memoize subscription callback', () => {
      let callbacks: Function[] = [];

      (featureFlagService.subscribe as jest.Mock).mockImplementation((flag, callback) => {
        callbacks.push(callback);
        return jest.fn();
      });

      const { rerender } = renderHook(() => useFeatureFlag('memoTest'));

      // const firstCallback = callbacks[0]; // unused variable

      // Rerender multiple times
      rerender();
      rerender();
      rerender();

      // Should still only have one subscription
      expect(callbacks.length).toBe(1);
      expect(featureFlagService.subscribe).toHaveBeenCalledTimes(1);
    });
  });
});

