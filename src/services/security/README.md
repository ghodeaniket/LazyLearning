# Security Services

This directory contains comprehensive security implementations for the LazyLearner mobile application.

## Security Features

### 1. Content Security Policy (CSP) Headers
- **File**: `headers.ts`
- **Purpose**: Prevents XSS, clickjacking, and other injection attacks
- **Features**:
  - X-Frame-Options: DENY
  - X-XSS-Protection
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security (HSTS)
  - Content-Security-Policy for web views

### 2. Request Signing
- **File**: `requestSigning.ts`
- **Purpose**: Ensures API request integrity and authenticity
- **Features**:
  - HMAC-SHA256 signatures
  - Timestamp validation (5-minute window)
  - Nonce for replay attack prevention
  - Automatic key generation and storage

### 3. Certificate Pinning
- **File**: `certificatePinning.ts`
- **Purpose**: Prevents man-in-the-middle attacks
- **Features**:
  - SSL/TLS certificate validation
  - Backup pin support for certificate rotation
  - Subdomain support
  - Expiration date handling

### 4. Encryption Service
- **File**: `encryption.ts`
- **Purpose**: Protects sensitive data in transit
- **Features**:
  - AES-256 encryption
  - PBKDF2 key derivation
  - Request/response encryption
  - Field-level encryption
  - Secure token generation

### 5. Device Fingerprinting
- **File**: `deviceFingerprint.ts`
- **Purpose**: Device identification and validation
- **Features**:
  - Unique device ID generation
  - Hardware/software characteristic collection
  - Device change detection
  - Battery and network status monitoring

### 6. Jailbreak/Root Detection
- **File**: `jailbreakDetection.ts`
- **Purpose**: Detects compromised devices
- **Features**:
  - Jailbreak detection (iOS)
  - Root detection (Android)
  - Hook detection
  - Debug mode detection
  - App store verification

### 7. Session Management
- **File**: `sessionManager.ts`
- **Purpose**: Secure session handling with timeouts
- **Features**:
  - Configurable inactivity timeout (default: 15 minutes)
  - Maximum session duration (default: 24 hours)
  - Background timeout handling
  - Warning notifications before timeout
  - Device verification

### 8. Input Validation & Sanitization
- **File**: `validation.ts`
- **Purpose**: Prevents injection attacks and ensures data integrity
- **Features**:
  - Email, password, username validation
  - XSS prevention
  - SQL injection prevention
  - Credit card validation (Luhn algorithm)
  - File upload validation
  - Custom validation schemas

### 9. Biometric Authentication
- **File**: `biometricAuth.ts`
- **Purpose**: Secure authentication using device biometrics
- **Features**:
  - Touch ID / Face ID (iOS)
  - Fingerprint authentication (Android)
  - Secure credential storage
  - Fallback to device passcode
  - Biometric-protected data storage

## Usage Examples

### Secure API Request
```typescript
import { secureApiClient } from '@services/api';

// Encrypted and signed request
const response = await secureApiClient.encryptedPost('/api/sensitive', {
  creditCard: '4111111111111111',
  cvv: '123'
}, {
  sensitiveFields: ['creditCard', 'cvv']
});
```

### Biometric Authentication
```typescript
import { biometricAuth } from '@services/security';

// Enable biometric login
const result = await biometricAuth.enrollBiometric(userId, authToken);

// Authenticate with biometric
const auth = await biometricAuth.authenticateWithBiometric();
if (auth.success) {
  console.log('Authenticated:', auth.userId);
}
```

### Input Validation
```typescript
import { validationService } from '@services/security';

const schema = validationService.getAuthValidationSchema();
const result = validationService.validate({
  email: userInput.email,
  password: userInput.password
}, schema);

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Enable certificate pinning** for API endpoints
3. **Validate all user input** before processing
4. **Use biometric authentication** when available
5. **Implement proper session timeouts**
6. **Monitor for jailbroken/rooted devices**
7. **Encrypt sensitive data** both in transit and at rest
8. **Use request signing** for critical API endpoints
9. **Implement rate limiting** to prevent abuse
10. **Log security events** for monitoring and analysis

## Configuration

Security features can be configured via environment variables:

```env
# Certificate Pinning
API_CERT_PIN=sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
API_CERT_PIN_BACKUP=sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=

# Client Identification
CLIENT_ID=lazylearner-mobile-app
```

## Testing

Security features are automatically disabled or relaxed in development mode (`__DEV__`) to facilitate testing. In production, all security measures are strictly enforced.

## Compliance

These security implementations help meet various compliance requirements:
- **OWASP Mobile Top 10** protection
- **PCI DSS** for payment processing
- **GDPR** for data protection
- **COPPA** for children's privacy