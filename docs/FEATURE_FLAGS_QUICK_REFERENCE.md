# Feature Flags Quick Reference

## 🚀 Common Usage Patterns

### In React Components

```typescript
// Option 1: Hook
import { useFeatureFlag } from '@hooks/useFeatureFlag';
import { FeatureFlags } from '@services/featureFlags';

const showFeature = useFeatureFlag(FeatureFlags.ENABLE_NEW_FEATURE);

// Option 2: Component
import { FeatureGate } from '@components/FeatureGate';

<FeatureGate feature={FeatureFlags.ENABLE_NEW_FEATURE}>
  <NewFeature />
</FeatureGate>
```

### In Services

```typescript
import { featureFlagService, FeatureFlags } from '@services/featureFlags';

const isEnabled = await featureFlagService.isEnabled(
  FeatureFlags.ENABLE_FEATURE,
  userId
);
```

## 📋 Available Flags

```typescript
// Security
FeatureFlags.ENABLE_BIOMETRIC_AUTH
FeatureFlags.ENABLE_CERTIFICATE_PINNING
FeatureFlags.ENABLE_REQUEST_SIGNING
FeatureFlags.ENABLE_ENCRYPTION
FeatureFlags.ENABLE_JAILBREAK_DETECTION

// API
FeatureFlags.ENABLE_RATE_LIMITING
FeatureFlags.ENABLE_REQUEST_RETRY
FeatureFlags.ENABLE_OFFLINE_MODE

// Monitoring
FeatureFlags.ENABLE_SENTRY
FeatureFlags.ENABLE_CRASHLYTICS
FeatureFlags.ENABLE_ANALYTICS
FeatureFlags.ENABLE_PERFORMANCE_MONITORING

// Development
FeatureFlags.ENABLE_DEBUG_MODE
FeatureFlags.SHOW_DEVELOPER_MENU

// Features
FeatureFlags.ENABLE_NEW_ONBOARDING
FeatureFlags.ENABLE_SOCIAL_LOGIN
FeatureFlags.ENABLE_PUSH_NOTIFICATIONS
```

## 🧪 Testing

```typescript
// Set override
featureFlagService.setOverride(FeatureFlags.MY_FLAG, true);

// Clear all overrides
featureFlagService.clearOverrides();

// Mock in Jest
jest.mock('@services/featureFlags', () => ({
  featureFlagService: {
    isEnabled: jest.fn().mockResolvedValue(true),
  },
}));
```

## 🎯 Best Practices Checklist

- [ ] Use `FeatureFlags` constants, not strings
- [ ] Provide fallback UI for disabled features
- [ ] Test both enabled and disabled states
- [ ] Remove flags after full rollout
- [ ] Use `showLoader={false}` for non-critical UI
- [ ] Default security flags to `true` in production

## 🔧 Configuration

```bash
# .env
FEATURE_FLAG_API_ENDPOINT=https://api.lazylearner.com/flags
FEATURE_FLAG_API_KEY=your-api-key
```

```typescript
// Initialize
await featureFlagService.initialize({
  enableRemoteConfig: true,
  refreshInterval: 300000, // 5 min
  defaultFlags: {
    [FeatureFlags.NEW_FEATURE]: false,
  },
});
```

## 📊 Rollout Strategies

```json
{
  "key": "enable_feature",
  "enabled": true,
  "rolloutPercentage": 25,        // 25% of users
  "targetedUsers": ["user1"],      // Specific users
  "metadata": { "version": "2.0" } // Extra data
}
```

## ⚡ Performance Tips

1. Feature flags are cached automatically
2. Remote flags refresh every 5 minutes
3. Use hooks for React components (auto-updates)
4. Batch flag checks in services

## 🐛 Common Issues

**Flag not working?**
1. Check spelling: `FeatureFlags.ENABLE_FEATURE`
2. Verify initialization completed
3. Pass userId for targeted flags
4. Check cache/refresh timing

**Need help?** See full guide: [FEATURE_FLAGS.md](./FEATURE_FLAGS.md)