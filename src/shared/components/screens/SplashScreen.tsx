import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../styles/theme';

export default function SplashScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Text style={styles.title}>Lazy Learner</Text>
      <Text style={styles.subtitle}>Loading...</Text>
      <ActivityIndicator size="large" color="white" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});
