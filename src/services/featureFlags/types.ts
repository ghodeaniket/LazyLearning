export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  targetedUsers?: string[];
  metadata?: Record<string, any>;
}

export interface FeatureFlagConfig {
  apiEndpoint?: string;
  refreshInterval?: number;
  defaultFlags?: Record<string, boolean>;
  enableCache?: boolean;
  enableRemoteConfig?: boolean;
}

export interface IFeatureFlagService {
  initialize(config?: FeatureFlagConfig): Promise<void>;
  isEnabled(flagKey: string, userId?: string): Promise<boolean>;
  getAllFlags(): Promise<Record<string, FeatureFlag>>;
  refresh(): Promise<void>;
  setOverride(flagKey: string, value: boolean): void;
  clearOverrides(): void;
}

export interface IFeatureFlagProvider {
  fetchFlags(): Promise<Record<string, FeatureFlag>>;
  reportUsage(flagKey: string, userId?: string): Promise<void>;
}

// Feature flag keys as constants to avoid magic strings
export const FeatureFlags = {
  // Security features
  ENABLE_BIOMETRIC_AUTH: 'enable_biometric_auth',
  ENABLE_CERTIFICATE_PINNING: 'enable_certificate_pinning',
  ENABLE_REQUEST_SIGNING: 'enable_request_signing',
  ENABLE_ENCRYPTION: 'enable_encryption',
  ENABLE_JAILBREAK_DETECTION: 'enable_jailbreak_detection',

  // API features
  ENABLE_RATE_LIMITING: 'enable_rate_limiting',
  ENABLE_REQUEST_RETRY: 'enable_request_retry',
  ENABLE_OFFLINE_MODE: 'enable_offline_mode',

  // Monitoring features
  ENABLE_SENTRY: 'enable_sentry',
  ENABLE_CRASHLYTICS: 'enable_crashlytics',
  ENABLE_ANALYTICS: 'enable_analytics',

  // Development features
  ENABLE_DEBUG_MODE: 'enable_debug_mode',
  ENABLE_PERFORMANCE_MONITORING: 'enable_performance_monitoring',
  SHOW_DEVELOPER_MENU: 'show_developer_menu',

  // Feature rollouts
  ENABLE_NEW_ONBOARDING: 'enable_new_onboarding',
  ENABLE_SOCIAL_LOGIN: 'enable_social_login',
  ENABLE_PUSH_NOTIFICATIONS: 'enable_push_notifications',
} as const;

export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];
