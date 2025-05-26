import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/styles/theme';
import { useAuth } from '../../../navigation/contexts/AuthContext';
import { Button } from '../../../shared/components/forms/Button';

export default function ProfileScreen() {
  const theme = useTheme();
  const { state, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Logout', onPress: signOut, style: 'destructive' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {state.user?.displayName || 'User'}
          </Text>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
            {state.user?.email}
          </Text>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
          testID="logout-button"
        />
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
  profileInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
});
