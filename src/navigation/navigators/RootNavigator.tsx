import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import SplashScreen from '../../shared/components/screens/SplashScreen';
import { useAuth } from '../contexts/AuthContext';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../shared/styles/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { state } = useAuth();
  const theme = useTheme();

  if (state.isLoading) {
    // Show splash screen while checking auth status
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {state.userToken == null ? (
          // No token found, user isn't signed in
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animationTypeForReplace: state.isSignout ? 'pop' : 'push',
            }}
          />
        ) : (
          // User is signed in
          <Stack.Screen
            name="Main"
            component={MainNavigator}
          />
        )}
      </Stack.Navigator>

      {/* Offline indicator */}
      {state.isOffline && (
        <View style={[styles.offlineIndicator, { backgroundColor: theme.colors.warning }]}>
          <Text style={styles.offlineText}>
            Offline Mode
          </Text>
        </View>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  offlineIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontSize: 12,
  },
});
