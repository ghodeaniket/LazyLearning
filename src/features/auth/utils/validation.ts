export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export const validateField = (value: string, rules: ValidationRule): string | null => {
  if (rules.required && !value.trim()) {
    return 'This field is required';
  }

  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const validateForm = (values: Record<string, string>, rules: ValidationRules): Record<string, string> => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach((key) => {
    const error = validateField(values[key] || '', rules[key]);
    if (error) {
      errors[key] = error;
    }
  });

  return errors;
};

// Common validation patterns
export const patterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
};

// Auth-specific validation rules
export const authValidationRules = {
  login: {
    email: {
      required: true,
      pattern: patterns.email,
      custom: (value: string) => {
        if (!patterns.email.test(value) && value.trim()) {
          return 'Please enter a valid email';
        }
        return null;
      },
    },
    password: {
      required: true,
      minLength: 6,
    },
  },

  signup: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: patterns.name,
      custom: (value: string) => {
        if (!patterns.name.test(value) && value.trim()) {
          return 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return null;
      },
    },
    email: {
      required: true,
      pattern: patterns.email,
      custom: (value: string) => {
        if (!patterns.email.test(value) && value.trim()) {
          return 'Please enter a valid email';
        }
        return null;
      },
    },
    password: {
      required: true,
      minLength: 8,
      custom: (value: string) => {
        if (!value) {return null;}

        const strength = getPasswordStrength(value);
        if (strength === 'weak') {
          return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
        }
        return null;
      },
    },
    confirmPassword: {
      required: true,
      custom: (_value: string) => {
        // This will be checked against password in the component
        return null;
      },
    },
  },

  forgotPassword: {
    email: {
      required: true,
      pattern: patterns.email,
      custom: (value: string) => {
        if (!patterns.email.test(value) && value.trim()) {
          return 'Please enter a valid email';
        }
        return null;
      },
    },
  },
};

// Password strength checker
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (!password || password.length < 6) {return 'weak';}

  let strength = 0;

  // Length check
  if (password.length >= 8) {strength++;}
  if (password.length >= 12) {strength++;}

  // Character variety checks
  if (/[a-z]/.test(password)) {strength++;}
  if (/[A-Z]/.test(password)) {strength++;}
  if (/[0-9]/.test(password)) {strength++;}
  if (/[^A-Za-z0-9]/.test(password)) {strength++;}

  if (strength <= 3) {return 'weak';}
  if (strength <= 5) {return 'medium';}
  return 'strong';
};

// Error message mapping for Firebase auth errors
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || error?.message || '';

  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your network';
    default:
      return 'An unexpected error occurred. Please try again';
  }
};
