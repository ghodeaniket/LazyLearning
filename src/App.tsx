import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';
import {QueryClientProvider} from '@tanstack/react-query';
import {StyleSheet} from 'react-native';
import {store} from '@store';
import {queryClient} from '@services/queryClient';

const App: React.FC = () => {
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
});

export default App;
