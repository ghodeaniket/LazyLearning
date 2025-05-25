import { useState, useEffect } from 'react';
import { featureFlagService, FeatureFlagKey } from '../services/featureFlags';

export function useFeatureFlag(flagKey: FeatureFlagKey, userId?: string): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      try {
        const enabled = await featureFlagService.isEnabled(flagKey, userId);
        if (mounted) {
          setIsEnabled(enabled);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Error checking feature flag ${flagKey}:`, error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flagKey, userId]);

  return isLoading ? false : isEnabled;
}

export function useFeatureFlagWithLoading(
  flagKey: FeatureFlagKey,
  userId?: string
): { isEnabled: boolean; isLoading: boolean } {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      try {
        const enabled = await featureFlagService.isEnabled(flagKey, userId);
        if (mounted) {
          setIsEnabled(enabled);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Error checking feature flag ${flagKey}:`, error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flagKey, userId]);

  return { isEnabled, isLoading };
}
