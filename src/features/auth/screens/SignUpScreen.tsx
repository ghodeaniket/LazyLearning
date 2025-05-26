import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../../navigation/types';
import { TextInput } from '../../../shared/components/forms/TextInput';
import { Button } from '../../../shared/components/forms/Button';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useAuth } from '../../../navigation/contexts/AuthContext';
import { useTheme } from '../../../shared/styles/theme';
import { validateField, authValidationRules, getAuthErrorMessage } from '../utils/validation';

type Props = AuthStackScreenProps<'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const theme = useTheme();
  const { signUp, state } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Real-time validation
  useEffect(() => {
    if (touched.name) {
      const error = validateField(name, authValidationRules.signup.name);
      setErrors(prev => ({ ...prev, name: error || '' }));
    }
  }, [name, touched.name]);

  useEffect(() => {
    if (touched.email) {
      const error = validateField(email, authValidationRules.signup.email);
      setErrors(prev => ({ ...prev, email: error || '' }));
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) {
      const error = validateField(password, authValidationRules.signup.password);
      setErrors(prev => ({ ...prev, password: error || '' }));
    }
  }, [password, touched.password]);

  useEffect(() => {
    if (touched.confirmPassword && confirmPassword) {
      const error = password !== confirmPassword ? 'Passwords do not match' : '';
      setErrors(prev => ({ ...prev, confirmPassword: error }));
    }
  }, [password, confirmPassword, touched.confirmPassword]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSignUp = async () => {
    // Mark all fields as touched
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    // Validate all fields
    const nameError = validateField(name, authValidationRules.signup.name);
    const emailError = validateField(email, authValidationRules.signup.email);
    const passwordError = validateField(password, authValidationRules.signup.password);
    const confirmPasswordError = password !== confirmPassword ? 'Passwords do not match' : '';

    if (nameError || emailError || passwordError || confirmPasswordError) {
      setErrors({
        name: nameError || '',
        email: emailError || '',
        password: passwordError || '',
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, name);
      // Navigation will be handled automatically by auth state change
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error);
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content} testID="signup-screen">
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Start your learning journey today
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                onBlur={() => handleBlur('name')}
                error={touched.name ? errors.name : ''}
                autoCapitalize="words"
                autoComplete="name"
                leftIcon="person"
                testID="name-input"
              />

              <TextInput
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                onBlur={() => handleBlur('email')}
                error={touched.email ? errors.email : ''}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="email"
                testID="email-input"
              />

              <TextInput
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                onBlur={() => handleBlur('password')}
                error={touched.password ? errors.password : ''}
                isPassword
                autoComplete="password-new"
                leftIcon="lock"
                testID="password-input"
              />

              {password && <PasswordStrengthIndicator password={password} />}

              <TextInput
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => handleBlur('confirmPassword')}
                error={touched.confirmPassword ? errors.confirmPassword : ''}
                isPassword
                autoComplete="password-new"
                leftIcon="lock"
                testID="confirm-password-input"
              />

              <Button
                title="Sign Up"
                onPress={handleSignUp}
                loading={isLoading}
                disabled={isLoading || state.isLoading}
                style={styles.signUpButton}
                testID="signup-button"
              />

              <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
                By signing up, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={[styles.loginText, { color: theme.colors.primary }]}>
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 24,
  },
  signUpButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
