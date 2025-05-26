import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../../navigation/types';
import { TextInput } from '../../../shared/components/forms/TextInput';
import { Button } from '../../../shared/components/forms/Button';
import { useAuth } from '../../../navigation/contexts/AuthContext';
import { useTheme } from '../../../shared/styles/theme';
import { validateField, authValidationRules, getAuthErrorMessage } from '../utils/validation';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = AuthStackScreenProps<'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Real-time validation
  useEffect(() => {
    if (touched) {
      const validationError = validateField(email, authValidationRules.forgotPassword.email);
      setError(validationError || '');
    }
  }, [email, touched]);

  const handleResetPassword = async () => {
    setTouched(true);

    // Validate email
    const emailError = validateField(email, authValidationRules.forgotPassword.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      Alert.alert('Password Reset Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.success }]}>
              <Icon name="check-circle" size={48} color="white" />
            </View>
            <Text style={[styles.successTitle, { color: theme.colors.text }]}>
              Password reset email sent!
            </Text>
            <Text style={[styles.successMessage, { color: theme.colors.textSecondary }]}>
              Check your email for instructions to reset your password.
            </Text>
            <Button
              title="Back to Login"
              onPress={handleBackToLogin}
              style={styles.backButton}
              testID="back-to-login-button"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content} testID="forgot-password-screen">
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Reset Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Enter your email to reset password
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched(true)}
              error={touched ? error : ''}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="email"
              testID="email-input"
            />

            <Button
              title="Send Reset Email"
              onPress={handleResetPassword}
              loading={isLoading}
              disabled={isLoading}
              style={styles.resetButton}
              testID="reset-password-button"
            />

            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              We'll send you an email with instructions to reset your password.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    flex: 1,
  },
  resetButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
});
