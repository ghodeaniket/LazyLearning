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
import { useAuth } from '../../../navigation/contexts/AuthContext';
import { useTheme } from '../../../shared/styles/theme';
import { validateField, authValidationRules, getAuthErrorMessage } from '../utils/validation';

type Props = AuthStackScreenProps<'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { signIn, state } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Clear errors when values change
  useEffect(() => {
    if (touched.email) {
      const error = validateField(email, authValidationRules.login.email);
      setErrors(prev => ({ ...prev, email: error || '' }));
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) {
      const error = validateField(password, authValidationRules.login.password);
      setErrors(prev => ({ ...prev, password: error || '' }));
    }
  }, [password, touched.password]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleLogin = async () => {
    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate all fields
    const emailError = validateField(email, authValidationRules.login.email);
    const passwordError = validateField(password, authValidationRules.login.password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError || '',
        password: passwordError || '',
      });
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      // Navigation will be handled automatically by auth state change
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
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
          <View style={styles.content} testID="login-screen">
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Welcome Back!
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Sign in to continue learning
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                onBlur={() => handleBlur('password')}
                error={touched.password ? errors.password : ''}
                isPassword
                autoComplete="password"
                leftIcon="lock"
                testID="password-input"
              />

              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPassword}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading || state.isLoading}
                style={styles.loginButton}
                testID="login-button"
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={[styles.signUpText, { color: theme.colors.primary }]}>
                  Sign Up
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
  },
  header: {
    alignItems: 'center',
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
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
