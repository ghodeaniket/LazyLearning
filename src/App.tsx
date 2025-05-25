import React, {useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';
import {QueryClientProvider} from '@tanstack/react-query';
import {StyleSheet, View, Text} from 'react-native';
import {store} from '@store/index';
import {queryClient} from '@services/queryClient';
import {initializeFirebaseServices} from '@services/firebase';
import {initializeStorage} from '@services/storage';
import {initializeMonitoring} from '@services/monitoring';
import {initializeSecurity} from '@services/security';

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        await initializeFirebaseServices();
        await initializeStorage();
        initializeMonitoring();
        await initializeSecurity();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setInitError(error as Error);
      }
    };

    initializeServices();
  }, []);

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Failed to initialize app: {initError.message}
        </Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Initializing...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer>
              {/* Navigation will be added here */}
            </NavigationContainer>
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});

export default App;
