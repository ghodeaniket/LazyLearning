# Feature Flags Guide

## Overview

Feature flags (also known as feature toggles) allow you to enable or disable features without deploying new code. This guide explains how to use the feature flag system in LazyLearner.

## Table of Contents

- [Quick Start](#quick-start)
- [Available Feature Flags](#available-feature-flags)
- [React Components](#react-components)
- [React Hooks](#react-hooks)
- [Service Integration](#service-integration)
- [Configuration](#configuration)
- [Testing with Feature Flags](#testing-with-feature-flags)
- [Best Practices](#best-practices)

## Quick Start

### 1. Using Feature Flags in React Components

```typescript
import { useFeatureFlag } from '@hooks/useFeatureFlag';
import { FeatureFlags } from '@services/featureFlags';

function MyComponent() {
  const showNewFeature = useFeatureFlag(FeatureFlags.ENABLE_NEW_ONBOARDING);

  return (
    <View>
      {showNewFeature && <NewOnboardingFlow />}
      {!showNewFeature && <LegacyOnboardingFlow />}
    </View>
  );
}
```

### 2. Using the FeatureGate Component

```typescript
import { FeatureGate } from '@components/FeatureGate';
import { FeatureFlags } from '@services/featureFlags';

function MyScreen() {
  return (
    <View>
      <FeatureGate 
        feature={FeatureFlags.ENABLE_SOCIAL_LOGIN}
        fallback={<EmailLoginForm />}
      >
        <SocialLoginButtons />
      </FeatureGate>
    </View>
  );
}
```

## Available Feature Flags

### Security Features

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_BIOMETRIC_AUTH` | Enable Touch ID/Face ID authentication | true |
| `ENABLE_CERTIFICATE_PINNING` | Enable certificate pinning for API calls | true (prod only) |
| `ENABLE_REQUEST_SIGNING` | Enable HMAC request signing | true |
| `ENABLE_ENCRYPTION` | Enable request/response encryption | true |
| `ENABLE_JAILBREAK_DETECTION` | Enable jailbreak/root detection | true (prod only) |

### API Features

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_RATE_LIMITING` | Enable client-side rate limiting | true |
| `ENABLE_REQUEST_RETRY` | Enable automatic request retry | true |
| `ENABLE_OFFLINE_MODE` | Enable offline mode support | false |

### Monitoring Features

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_SENTRY` | Enable Sentry error tracking | true (prod only) |
| `ENABLE_CRASHLYTICS` | Enable Firebase Crashlytics | true (prod only) |
| `ENABLE_ANALYTICS` | Enable analytics tracking | true |
| `ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | false |

### Development Features

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_DEBUG_MODE` | Enable debug logging | true (dev only) |
| `SHOW_DEVELOPER_MENU` | Show developer menu | true (dev only) |

### Feature Rollouts

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_NEW_ONBOARDING` | New onboarding flow | false |
| `ENABLE_SOCIAL_LOGIN` | Social login options | false |
| `ENABLE_PUSH_NOTIFICATIONS` | Push notification support | false |

## React Components

### FeatureGate Component

The `FeatureGate` component conditionally renders children based on feature flag status.

```typescript
interface FeatureGateProps {
  feature: FeatureFlagKey;      // The feature flag to check
  userId?: string;               // Optional user ID for targeting
  children: ReactNode;           // Content to show when enabled
  fallback?: ReactNode;          // Content to show when disabled
  showLoader?: boolean;          // Show loader while checking
}
```

**Example with loading state:**

```typescript
<FeatureGate 
  feature={FeatureFlags.ENABLE_PUSH_NOTIFICATIONS}
  userId={currentUser.id}
  showLoader={true}
  fallback={<Text>Push notifications coming soon!</Text>}
>
  <PushNotificationSettings />
</FeatureGate>
```

## React Hooks

### useFeatureFlag

Simple hook that returns a boolean indicating if a feature is enabled.

```typescript
const isEnabled = useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN, userId);
```

### useFeatureFlagWithLoading

Hook that also returns loading state.

```typescript
const { isEnabled, isLoading } = useFeatureFlagWithLoading(
  FeatureFlags.ENABLE_NEW_ONBOARDING,
  userId
);

if (isLoading) {
  return <LoadingSpinner />;
}
```

## Service Integration

### Checking Feature Flags in Services

```typescript
import { featureFlagService, FeatureFlags } from '@services/featureFlags';

class MyService {
  async performAction() {
    const enableEncryption = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_ENCRYPTION,
      userId
    );

    if (enableEncryption) {
      // Encrypt data
    }
  }
}
```

### Initializing with Custom Configuration

```typescript
await featureFlagService.initialize({
  enableRemoteConfig: true,
  apiEndpoint: 'https://api.example.com/flags',
  refreshInterval: 300000, // 5 minutes
  defaultFlags: {
    [FeatureFlags.ENABLE_NEW_FEATURE]: false,
  },
});
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Feature Flag API Configuration
FEATURE_FLAG_API_ENDPOINT=https://api.lazylearner.com/flags
FEATURE_FLAG_API_KEY=your-api-key-here

# Default Feature Flags (optional)
ENABLE_BIOMETRIC_AUTH=true
ENABLE_SOCIAL_LOGIN=false
```

### Remote Configuration

The system supports fetching flags from a remote service:

```typescript
// Remote flag response format
{
  "flags": {
    "enable_social_login": {
      "key": "enable_social_login",
      "enabled": true,
      "rolloutPercentage": 50,
      "targetedUsers": ["user123", "user456"],
      "metadata": {
        "providers": ["google", "facebook"]
      }
    }
  }
}
```

## Testing with Feature Flags

### Unit Tests

```typescript
import { featureFlagService } from '@services/featureFlags';

describe('MyComponent', () => {
  beforeEach(() => {
    // Override feature flags for testing
    featureFlagService.setOverride(FeatureFlags.ENABLE_NEW_FEATURE, true);
  });

  afterEach(() => {
    // Clear overrides
    featureFlagService.clearOverrides();
  });

  it('should show new feature when enabled', () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// Mock the entire feature flag service
jest.mock('@services/featureFlags', () => ({
  featureFlagService: {
    isEnabled: jest.fn().mockResolvedValue(true),
  },
  FeatureFlags: {
    ENABLE_NEW_FEATURE: 'enable_new_feature',
  },
}));
```

## Best Practices

### 1. Use Constants

Always use the `FeatureFlags` constants instead of strings:

```typescript
// ✅ Good
useFeatureFlag(FeatureFlags.ENABLE_SOCIAL_LOGIN);

// ❌ Bad
useFeatureFlag('enable_social_login');
```

### 2. Provide Fallbacks

Always provide a fallback experience for disabled features:

```typescript
<FeatureGate 
  feature={FeatureFlags.ENABLE_ADVANCED_SEARCH}
  fallback={<BasicSearch />}
>
  <AdvancedSearch />
</FeatureGate>
```

### 3. Gradual Rollouts

Use rollout percentages for gradual feature releases:

```typescript
{
  "key": "enable_new_dashboard",
  "enabled": true,
  "rolloutPercentage": 25  // 25% of users
}
```

### 4. Clean Up Old Flags

Remove feature flags once a feature is fully rolled out:

1. Ensure feature is 100% rolled out
2. Monitor for issues (1-2 weeks)
3. Remove flag checks from code
4. Remove flag from configuration

### 5. Logging and Monitoring

Feature flag usage is automatically logged. Monitor these logs to understand:

- Which features are being used
- By which users
- Performance impact

### 6. Performance Considerations

- Feature flags are cached locally
- Remote flags refresh every 5 minutes by default
- Use `showLoader={false}` for non-critical UI elements

### 7. Security Features

Be cautious with security-related feature flags:

```typescript
// Security features should default to true in production
const defaults = {
  [FeatureFlags.ENABLE_ENCRYPTION]: !__DEV__,
  [FeatureFlags.ENABLE_CERTIFICATE_PINNING]: !__DEV__,
  [FeatureFlags.ENABLE_JAILBREAK_DETECTION]: !__DEV__,
};
```

## Troubleshooting

### Feature Flag Not Working

1. Check if the flag key exists in `FeatureFlags` constant
2. Verify initialization has completed
3. Check for typos in flag names
4. Ensure user ID is passed if using targeted flags

### Performance Issues

1. Reduce refresh interval for remote flags
2. Enable caching (default: true)
3. Use `useFeatureFlag` instead of direct service calls in components

### Testing Issues

1. Clear overrides between tests
2. Mock at the appropriate level (component vs service)
3. Use consistent flag states across test suites

## Examples

### Complex Feature Gate

```typescript
function PaymentScreen() {
  const { user } = useAuth();
  
  return (
    <FeatureGate
      feature={FeatureFlags.ENABLE_SOCIAL_LOGIN}
      userId={user?.id}
      showLoader={true}
      fallback={
        <View style={styles.comingSoon}>
          <Text>New payment options coming soon!</Text>
          <EmailSupport />
        </View>
      }
    >
      <View>
        <ApplePay />
        <GooglePay />
        <CreditCardForm />
      </View>
    </FeatureGate>
  );
}
```

### Service with Multiple Flags

```typescript
class DataSyncService {
  async syncData() {
    const features = await Promise.all([
      featureFlagService.isEnabled(FeatureFlags.ENABLE_OFFLINE_MODE),
      featureFlagService.isEnabled(FeatureFlags.ENABLE_ENCRYPTION),
      featureFlagService.isEnabled(FeatureFlags.ENABLE_COMPRESSION),
    ]);

    const [offlineMode, encryption, compression] = features;

    let data = await this.fetchData();

    if (compression) {
      data = await this.compress(data);
    }

    if (encryption) {
      data = await this.encrypt(data);
    }

    if (offlineMode) {
      await this.cacheLocally(data);
    }

    return data;
  }
}
```

## Migration Guide

If you're adding feature flags to existing features:

1. **Identify the feature** to be flagged
2. **Add the flag** to `FeatureFlags` constant
3. **Wrap the feature** with flag check
4. **Set default value** (usually `true` for existing features)
5. **Test both states** (enabled/disabled)
6. **Deploy and monitor**

Example migration:

```typescript
// Before
function ProfileScreen() {
  return (
    <View>
      <ProfileHeader />
      <BiometricSettings />  {/* Always shown */}
    </View>
  );
}

// After
function ProfileScreen() {
  const showBiometric = useFeatureFlag(FeatureFlags.ENABLE_BIOMETRIC_AUTH);
  
  return (
    <View>
      <ProfileHeader />
      {showBiometric && <BiometricSettings />}
    </View>
  );
}
```

## API Reference

See the [Feature Flag API Reference](./API_REFERENCE.md#feature-flags) for detailed API documentation.