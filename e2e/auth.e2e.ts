import { by, device, element, expect } from 'detox';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Login Flow', () => {
    it('should display login screen on app launch', async () => {
      await expect(element(by.id('login-screen'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('login-button'))).toBeVisible();
      await expect(element(by.text('Don\'t have an account? Sign Up'))).toBeVisible();
    });

    it('should show validation errors for empty fields', async () => {
      await element(by.id('login-button')).tap();

      await expect(element(by.text('Email is required'))).toBeVisible();
      await expect(element(by.text('Password is required'))).toBeVisible();
    });

    it('should show validation error for invalid email', async () => {
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      await expect(element(by.text('Please enter a valid email'))).toBeVisible();
    });

    it('should show error for incorrect credentials', async () => {
      await element(by.id('email-input')).typeText('wrong@example.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('login-button')).tap();

      await expect(element(by.text('Invalid email or password'))).toBeVisible();
    });

    it('should successfully login with valid credentials', async () => {
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('login-button')).tap();

      // Should navigate to home screen
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.text('Welcome back!'))).toBeVisible();
    });

    it('should toggle password visibility', async () => {
      await element(by.id('password-input')).typeText('Test123!');

      // Password should be hidden by default
      await expect(element(by.id('password-input'))).toHaveToggleValue(false);

      // Toggle to show password
      await element(by.id('password-toggle')).tap();
      await expect(element(by.id('password-input'))).toHaveToggleValue(true);
    });

    it('should navigate to forgot password screen', async () => {
      await element(by.text('Forgot Password?')).tap();
      await expect(element(by.id('forgot-password-screen'))).toBeVisible();
    });
  });

  describe('Sign Up Flow', () => {
    beforeEach(async () => {
      await element(by.text('Don\'t have an account? Sign Up')).tap();
    });

    it('should display sign up screen with all fields', async () => {
      await expect(element(by.id('signup-screen'))).toBeVisible();
      await expect(element(by.id('name-input'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('confirm-password-input'))).toBeVisible();
      await expect(element(by.id('signup-button'))).toBeVisible();
    });

    it('should show validation errors for empty fields', async () => {
      await element(by.id('signup-button')).tap();

      await expect(element(by.text('Name is required'))).toBeVisible();
      await expect(element(by.text('Email is required'))).toBeVisible();
      await expect(element(by.text('Password is required'))).toBeVisible();
    });

    it('should show password strength indicator', async () => {
      await element(by.id('password-input')).typeText('weak');
      await expect(element(by.text('Weak password'))).toBeVisible();

      await element(by.id('password-input')).clearText();
      await element(by.id('password-input')).typeText('StrongP@ss123');
      await expect(element(by.text('Strong password'))).toBeVisible();
    });

    it('should validate password confirmation', async () => {
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('confirm-password-input')).typeText('Test123');
      await element(by.id('signup-button')).tap();

      await expect(element(by.text('Passwords do not match'))).toBeVisible();
    });

    it('should successfully create account', async () => {
      await element(by.id('name-input')).typeText('Test User');
      await element(by.id('email-input')).typeText('newuser@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('confirm-password-input')).typeText('Test123!');
      await element(by.id('signup-button')).tap();

      // Should navigate to home screen after successful signup
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.text('Welcome, Test User!'))).toBeVisible();
    });

    it('should show error for existing email', async () => {
      await element(by.id('name-input')).typeText('Test User');
      await element(by.id('email-input')).typeText('existing@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('confirm-password-input')).typeText('Test123!');
      await element(by.id('signup-button')).tap();

      await expect(element(by.text('An account with this email already exists'))).toBeVisible();
    });
  });

  describe('Forgot Password Flow', () => {
    beforeEach(async () => {
      await element(by.text('Forgot Password?')).tap();
    });

    it('should display forgot password screen', async () => {
      await expect(element(by.id('forgot-password-screen'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('reset-password-button'))).toBeVisible();
      await expect(element(by.text('Enter your email to reset password'))).toBeVisible();
    });

    it('should validate email before sending reset', async () => {
      await element(by.id('reset-password-button')).tap();
      await expect(element(by.text('Email is required'))).toBeVisible();

      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('reset-password-button')).tap();
      await expect(element(by.text('Please enter a valid email'))).toBeVisible();
    });

    it('should send password reset email successfully', async () => {
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('reset-password-button')).tap();

      await expect(element(by.text('Password reset email sent!'))).toBeVisible();
      await expect(element(by.text('Check your email for instructions'))).toBeVisible();

      // Should navigate back to login after success
      await element(by.id('back-to-login-button')).tap();
      await expect(element(by.id('login-screen'))).toBeVisible();
    });

    it('should handle non-existent email gracefully', async () => {
      await element(by.id('email-input')).typeText('nonexistent@example.com');
      await element(by.id('reset-password-button')).tap();

      // Should still show success for security reasons
      await expect(element(by.text('Password reset email sent!'))).toBeVisible();
    });
  });

  describe('Authentication State Persistence', () => {
    it('should remain logged in after app restart', async () => {
      // Login first
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('login-button')).tap();

      // Verify logged in
      await expect(element(by.id('home-screen'))).toBeVisible();

      // Restart app
      await device.launchApp({ newInstance: false });

      // Should still be logged in
      await expect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should handle logout correctly', async () => {
      // Navigate to profile/settings
      await element(by.id('profile-tab')).tap();
      await element(by.id('logout-button')).tap();

      // Confirm logout
      await element(by.text('Yes, Logout')).tap();

      // Should navigate back to login screen
      await expect(element(by.id('login-screen'))).toBeVisible();
    });
  });

  describe('Offline Authentication', () => {
    it('should allow login when offline with cached credentials', async () => {
      // First login while online
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('login-button')).tap();
      await expect(element(by.id('home-screen'))).toBeVisible();

      // Logout
      await element(by.id('profile-tab')).tap();
      await element(by.id('logout-button')).tap();
      await element(by.text('Yes, Logout')).tap();

      // Go offline
      await device.disableSynchronization();
      await device.setURLBlacklist(['.*']);

      // Try to login again
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('login-button')).tap();

      // Should still work with cached credentials
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.text('Offline Mode'))).toBeVisible();

      // Re-enable network
      await device.setURLBlacklist([]);
      await device.enableSynchronization();
    });

    it('should show appropriate error when offline without cached credentials', async () => {
      // Go offline
      await device.disableSynchronization();
      await device.setURLBlacklist(['.*']);

      // Try to login with new credentials
      await element(by.id('email-input')).typeText('newuser@example.com');
      await element(by.id('password-input')).typeText('NewPass123!');
      await element(by.id('login-button')).tap();

      await expect(element(by.text('No internet connection. Please try again later.'))).toBeVisible();

      // Re-enable network
      await device.setURLBlacklist([]);
      await device.enableSynchronization();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during login', async () => {
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Test123!');
      await element(by.id('login-button')).tap();

      // Should show loading state
      await expect(element(by.id('login-loading'))).toBeVisible();
      await expect(element(by.id('login-button'))).toHaveLabel('disabled');

      // Loading should disappear after login
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.id('login-loading'))).not.toBeVisible();
    });
  });
});
