import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/styles/theme';
import { useAuth } from '../../../navigation/contexts/AuthContext';

export default function HomeScreen() {
  const theme = useTheme();
  const { state } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} testID="home-screen">
      <View style={styles.content}>
        <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
          Welcome back{state.user?.displayName ? `, ${state.user.displayName}` : ''}!
        </Text>
        {state.isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: theme.colors.warning }]}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  offlineBanner: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontWeight: '600',
  },
});
