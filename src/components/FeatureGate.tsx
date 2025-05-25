import React, { memo, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFeatureFlagWithLoading } from '../hooks/useFeatureFlag';
import { FeatureFlagKey } from '../services/featureFlags';

interface FeatureGateProps {
  feature: FeatureFlagKey;
  userId?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLoader?: boolean;
}

export const FeatureGate = memo<FeatureGateProps>(({
  feature,
  userId,
  children,
  fallback = null,
  showLoader = false,
}) => {
  const { isEnabled, isLoading } = useFeatureFlagWithLoading(feature, userId);

  if (isLoading && showLoader) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <>{isEnabled ? children : fallback}</>;
});

FeatureGate.displayName = 'FeatureGate';

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
