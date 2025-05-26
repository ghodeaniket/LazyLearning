import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  sanitize?: boolean;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  sanitizedData?: Record<string, any>;
}

export class ValidationService {
  private static instance: ValidationService;

  // Common regex patterns
  private patterns = {
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
    username: /^[a-zA-Z0-9_-]{3,16}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    phoneNumber: /^\+?[1-9]\d{1,14}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    creditCard: /^[0-9]{13,19}$/,
    cvv: /^[0-9]{3,4}$/,
    postalCode: /^[A-Z0-9]{3,10}$/i,
  };

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, any> = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors: string[] = [];
      let sanitizedValue = value;

      for (const rule of rules) {
        // Sanitize first if requested
        if (rule.sanitize && typeof value === 'string') {
          sanitizedValue = this.sanitizeInput(value, field);
        }

        const error = this.validateRule(sanitizedValue, rule, field);
        if (error) {
          fieldErrors.push(error);
          isValid = false;
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }

      sanitizedData[field] = sanitizedValue;
    }

    return {
      isValid,
      errors,
      sanitizedData: isValid ? sanitizedData : undefined,
    };
  }

  private validateRule(value: any, rule: ValidationRule, _field: string): string | null {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return rule.message;
        }
        break;

      case 'email':
        if (value && !validator.isEmail(value)) {
          return rule.message;
        }
        break;

      case 'minLength':
        if (value && value.length < rule.value) {
          return rule.message;
        }
        break;

      case 'maxLength':
        if (value && value.length > rule.value) {
          return rule.message;
        }
        break;

      case 'pattern':
        if (value && !rule.value.test(value)) {
          return rule.message;
        }
        break;

      case 'custom':
        if (rule.value && typeof rule.value === 'function') {
          const result = rule.value(value);
          if (result !== true) {
            return typeof result === 'string' ? result : rule.message;
          }
        }
        break;
    }

    return null;
  }

  sanitizeInput(input: string, context: string = 'default'): string {
    if (!input) {return '';}

    // Basic sanitization
    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Context-specific sanitization
    switch (context) {
      case 'html':
        sanitized = DOMPurify.sanitize(sanitized, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: [],
        });
        break;

      case 'username':
        sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
        break;

      case 'email':
        sanitized = sanitized.toLowerCase();
        break;

      case 'phone':
        sanitized = sanitized.replace(/[^0-9+]/g, '');
        break;

      case 'alphanumeric':
        sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
        break;

      case 'numeric':
        sanitized = sanitized.replace(/[^0-9]/g, '');
        break;

      default:
        // Escape HTML entities
        sanitized = sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
    }

    return sanitized;
  }

  // Specific validators
  isValidEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  isValidPassword(password: string): boolean {
    return this.patterns.password.test(password);
  }

  isValidUsername(username: string): boolean {
    return this.patterns.username.test(username);
  }

  isValidPhoneNumber(phone: string): boolean {
    return this.patterns.phoneNumber.test(phone);
  }

  isValidURL(url: string): boolean {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
    });
  }

  isValidCreditCard(cardNumber: string): boolean {
    const sanitized = cardNumber.replace(/\s/g, '');
    return this.patterns.creditCard.test(sanitized) && this.luhnCheck(sanitized);
  }

  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  // Input filtering
  filterInput(input: string, allowedChars: RegExp): string {
    return input.split('').filter(char => allowedChars.test(char)).join('');
  }

  // XSS prevention
  escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // SQL injection prevention - WARNING: Always use parameterized queries instead
  // This method is provided only for legacy compatibility
  // DO NOT use for new code - use parameterized queries/prepared statements
  escapeSql(_unsafe: string): string {
    throw new Error('SQL escape is deprecated. Use parameterized queries instead.');
  }

  // Validate file upload
  validateFile(file: {
    name: string;
    size: number;
    type: string;
  }, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): ValidationResult {
    const errors: string[] = [];

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`File size exceeds ${options.maxSize / 1024 / 1024}MB limit`);
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push('File extension not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? { file: errors } : {},
    };
  }

  // Create common validation schemas
  getAuthValidationSchema(): ValidationSchema {
    return {
      email: [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Invalid email format' },
        { type: 'maxLength', value: 255, message: 'Email too long' },
      ],
      password: [
        { type: 'required', message: 'Password is required' },
        { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
        {
          type: 'pattern',
          value: this.patterns.password,
          message: 'Password must contain uppercase, lowercase, number and special character',
        },
      ],
    };
  }

  getProfileValidationSchema(): ValidationSchema {
    return {
      username: [
        { type: 'required', message: 'Username is required' },
        {
          type: 'pattern',
          value: this.patterns.username,
          message: 'Username can only contain letters, numbers, _ and -',
        },
        { type: 'minLength', value: 3, message: 'Username too short' },
        { type: 'maxLength', value: 16, message: 'Username too long' },
      ],
      displayName: [
        { type: 'maxLength', value: 50, message: 'Display name too long', sanitize: true },
      ],
      bio: [
        { type: 'maxLength', value: 500, message: 'Bio too long', sanitize: true },
      ],
    };
  }
}

export const validationService = ValidationService.getInstance();

// Export validator for direct use
export { validator };
