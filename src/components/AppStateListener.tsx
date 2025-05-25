import React, { useEffect, useRef, ReactNode, memo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { sessionManager } from '../services/security/sessionManager';
import { sentryService } from '../services/monitoring/sentry';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { FeatureFlags } from '../services/featureFlags';

interface AppStateListenerProps {
  children: ReactNode;
  onBackground?: () => void;
  onForeground?: () => void;
  onInactive?: () => void;
}

export const AppStateListener = memo<AppStateListenerProps>(({
  children,
  onBackground,
  onForeground,
  onInactive,
}) => {
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);
  const enablePerformanceMonitoring = useFeatureFlag(
    FeatureFlags.ENABLE_PERFORMANCE_MONITORING
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appState.current;

      // Log state transitions
      sentryService.addBreadcrumb({
        message: 'App state changed',
        category: 'app.lifecycle',
        level: 'info',
        data: {
          from: previousState,
          to: nextAppState,
        },
      });

      // Handle background transition
      if (
        previousState.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        backgroundTime.current = Date.now();

        if (nextAppState === 'background') {
          onBackground?.();
        } else if (nextAppState === 'inactive') {
          onInactive?.();
        }
      }

      // Handle foreground transition
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (backgroundTime.current && enablePerformanceMonitoring) {
          const timeInBackground = Date.now() - backgroundTime.current;
          sentryService.addBreadcrumb({
            message: 'App returned to foreground',
            category: 'app.lifecycle',
            level: 'info',
            data: {
              timeInBackground,
            },
          });
        }

        backgroundTime.current = null;
        onForeground?.();

        // Update session activity when app comes to foreground
        sessionManager.updateActivity().catch(error => {
          console.error('Failed to update session activity:', error);
        });
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [onBackground, onForeground, onInactive, enablePerformanceMonitoring]);

  return <>{children}</>;
});

AppStateListener.displayName = 'AppStateListener';
