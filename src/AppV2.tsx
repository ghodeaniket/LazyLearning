import React, { useEffect, useReducer, useCallback, memo } from 'react';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { store } from './store';
import { queryClient } from './services/queryClient';
import { AppInitializer } from './services/initialization/AppInitializer';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import { FeatureFlags } from './services/featureFlags';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppStateListener } from './components/AppStateListener';
import { NetworkStatusProvider } from './components/NetworkStatusProvider';

// App state types
interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

type AppAction =
  | { type: 'INIT_START' }
  | { type: 'INIT_SUCCESS' }
  | { type: 'INIT_ERROR'; error: Error };

// App state reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'INIT_START':
      return { ...state, isLoading: true, error: null };
    case 'INIT_SUCCESS':
      return { isInitialized: true, isLoading: false, error: null };
    case 'INIT_ERROR':
      return { ...state, isLoading: false, error: action.error };
    default:
      return state;
  }
};

// Loading component
const LoadingScreen = memo(() => (
  <View style={styles.centerContainer}>
    <ActivityIndicator
      size="large"
      color={Platform.OS === 'ios' ? '#007AFF' : '#2196F3'}
    />
    <Text style={styles.loadingText}>Initializing LazyLearner...</Text>
  </View>
));

LoadingScreen.displayName = 'LoadingScreen';

// Error component
const ErrorScreen = memo<{ error: Error; onRetry: () => void }>(
  ({ error, onRetry }) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Unable to start LazyLearner</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Text style={styles.retryButton} onPress={onRetry}>
        Tap to retry
      </Text>
    </View>
  )
);

ErrorScreen.displayName = 'ErrorScreen';

// Main app content
const AppContent = memo(() => {
  const showDeveloperMenu = useFeatureFlag(FeatureFlags.SHOW_DEVELOPER_MENU);

  return (
    <NavigationContainer>
      {/* Navigation will be added here */}
      <View style={styles.tempContent}>
        <Text>LazyLearner App</Text>
        {showDeveloperMenu && <Text>Developer Mode Enabled</Text>}
      </View>
    </NavigationContainer>
  );
});

AppContent.displayName = 'AppContent';

// Main App component following best practices
const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, {
    isInitialized: false,
    isLoading: false,
    error: null,
  });

  const initializeApp = useCallback(async () => {
    dispatch({ type: 'INIT_START' });
    try {
      const initializer = AppInitializer.getInstance();
      await initializer.initialize();
      dispatch({ type: 'INIT_SUCCESS' });
    } catch (error) {
      console.error('App initialization failed:', error);
      dispatch({ type: 'INIT_ERROR', error: error as Error });
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Performance optimization: Render loading/error states early
  if (state.error) {
    return <ErrorScreen error={state.error} onRetry={initializeApp} />;
  }

  if (!state.isInitialized || state.isLoading) {
    return <LoadingScreen />;
  }

  // Main app with all providers
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
              <NetworkStatusProvider>
                <AppStateListener>
                  <AppContent />
                </AppStateListener>
              </NetworkStatusProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    padding: 12,
  },
  tempContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
