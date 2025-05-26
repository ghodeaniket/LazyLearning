import { validationService } from '../validation';

describe('ValidationService', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(validationService.isValidEmail('user@example.com')).toBe(true);
      expect(validationService.isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(validationService.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validationService.isValidEmail('invalid.email')).toBe(false);
      expect(validationService.isValidEmail('@example.com')).toBe(false);
      expect(validationService.isValidEmail('user@')).toBe(false);
      expect(validationService.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      expect(validationService.isValidPassword('StrongP@ss123')).toBe(true);
      expect(validationService.isValidPassword('MySecure#123Pass')).toBe(true);
      expect(validationService.isValidPassword('Test@1234')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validationService.isValidPassword('weak')).toBe(false);
      expect(validationService.isValidPassword('12345678')).toBe(false);
      expect(validationService.isValidPassword('password')).toBe(false);
      expect(validationService.isValidPassword('NoNumbers!')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(validationService.isValidUsername('john_doe')).toBe(true);
      expect(validationService.isValidUsername('user123')).toBe(true);
      expect(validationService.isValidUsername('test_user_99')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validationService.isValidUsername('ab')).toBe(false); // too short
      expect(validationService.isValidUsername('user name')).toBe(false); // spaces
      expect(validationService.isValidUsername('user@name')).toBe(false); // special chars
      expect(validationService.isValidUsername('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(validationService.sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(validationService.sanitizeInput('normal text')).toBe('normal text');
      expect(validationService.sanitizeInput('user & company')).toBe('user &amp; company');
    });

    it('should handle null and undefined', () => {
      expect(validationService.sanitizeInput(null as any)).toBe('');
      expect(validationService.sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URLs', () => {
      expect(validationService.isValidURL('https://example.com')).toBe(true);
      expect(validationService.isValidURL('http://localhost:3000')).toBe(true);
      expect(validationService.isValidURL('https://api.example.com/v1/users')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validationService.isValidURL('not a url')).toBe(false);
      expect(validationService.isValidURL('javascript:alert(1)')).toBe(false);
      expect(validationService.isValidURL('ftp://example.com')).toBe(false);
      expect(validationService.isValidURL('example.com')).toBe(false);
      expect(validationService.isValidURL('')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validationService.isValidPhoneNumber('+1234567890')).toBe(true);
      expect(validationService.isValidPhoneNumber('+44123456789')).toBe(true);
      expect(validationService.isValidPhoneNumber('+919876543210')).toBe(true);
      expect(validationService.isValidPhoneNumber('1234567890')).toBe(true); // Without + is valid
    });

    it('should reject invalid phone numbers', () => {
      expect(validationService.isValidPhoneNumber('+123')).toBe(false); // too short
      expect(validationService.isValidPhoneNumber('phone')).toBe(false);
      expect(validationService.isValidPhoneNumber('')).toBe(false);
      expect(validationService.isValidPhoneNumber('0123456789')).toBe(false); // Starts with 0
    });
  });

  describe('validate', () => {
    const schema = {
      email: [
        { type: 'required' as const, message: 'Email is required' },
        { type: 'email' as const, message: 'Invalid email' },
      ],
      password: [
        { type: 'required' as const, message: 'Password is required' },
        { type: 'minLength' as const, value: 8, message: 'Password too short' },
      ],
    };

    it('should validate valid data', () => {
      const result = validationService.validate({
        email: 'test@example.com',
        password: 'password123',
      }, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitizedData).toBeDefined();
    });

    it('should return errors for invalid data', () => {
      const result = validationService.validate({
        email: 'invalid-email',
        password: 'short',
      }, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('Invalid email');
      expect(result.errors.password).toContain('Password too short');
    });
  });

  describe('isValidCreditCard', () => {
    it('should validate correct credit card numbers', () => {
      expect(validationService.isValidCreditCard('4111111111111111')).toBe(true);
      expect(validationService.isValidCreditCard('5500000000000004')).toBe(true);
    });

    it('should reject invalid credit card numbers', () => {
      expect(validationService.isValidCreditCard('1234567890123456')).toBe(false);
      expect(validationService.isValidCreditCard('not-a-card')).toBe(false);
    });
  });

  describe('getAuthValidationSchema', () => {
    it('should return auth validation schema', () => {
      const schema = validationService.getAuthValidationSchema();
      expect(schema.email).toBeDefined();
      expect(schema.password).toBeDefined();
    });
  });
});

