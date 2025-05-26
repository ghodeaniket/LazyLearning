import { initializeFirebaseServices } from '../firebase';
import { initializeStorage } from '../storage';
import { initializeMonitoring } from '../monitoring';
import { initializeSecurity } from '../security';
import { featureFlagService, FeatureFlags } from '../featureFlags';
// import { tokenManager } from '../auth/tokenManager';
import { rateLimiter, defaultRateLimitRules } from '../api/rateLimiter';
import Config from 'react-native-config';

// Service initializer interface
interface IServiceInitializer {
  initialize(): Promise<void>;
  getName(): string;
  getPriority(): number;
}

// Individual service initializers
class StorageInitializer implements IServiceInitializer {
  async initialize(): Promise<void> {
    await initializeStorage();
  }

  getName(): string {
    return 'Storage';
  }

  getPriority(): number {
    return 1; // Highest priority
  }
}

class FeatureFlagInitializer implements IServiceInitializer {
  async initialize(): Promise<void> {
    await featureFlagService.initialize({
      enableRemoteConfig: !__DEV__,
      apiEndpoint: Config.FEATURE_FLAG_API_ENDPOINT,
      refreshInterval: 300000, // 5 minutes
      defaultFlags: {
        [FeatureFlags.ENABLE_BIOMETRIC_AUTH]: true,
        [FeatureFlags.ENABLE_CERTIFICATE_PINNING]: !__DEV__,
        [FeatureFlags.ENABLE_REQUEST_SIGNING]: true,
        [FeatureFlags.ENABLE_ENCRYPTION]: true,
        [FeatureFlags.ENABLE_JAILBREAK_DETECTION]: !__DEV__,
        [FeatureFlags.ENABLE_RATE_LIMITING]: true,
        [FeatureFlags.ENABLE_REQUEST_RETRY]: true,
        [FeatureFlags.ENABLE_SENTRY]: !__DEV__,
        [FeatureFlags.ENABLE_CRASHLYTICS]: !__DEV__,
        [FeatureFlags.ENABLE_ANALYTICS]: true,
        [FeatureFlags.ENABLE_DEBUG_MODE]: __DEV__,
        [FeatureFlags.SHOW_DEVELOPER_MENU]: __DEV__,
      },
    });
  }

  getName(): string {
    return 'Feature Flags';
  }

  getPriority(): number {
    return 2;
  }
}

class FirebaseInitializer implements IServiceInitializer {
  async initialize(): Promise<void> {
    // Feature flags will be used to conditionally enable services in the future
    // const enableAnalytics = await featureFlagService.isEnabled(
    //   FeatureFlags.ENABLE_ANALYTICS
    // );
    // const enableCrashlytics = await featureFlagService.isEnabled(
    //   FeatureFlags.ENABLE_CRASHLYTICS
    // );

    await initializeFirebaseServices();
  }

  getName(): string {
    return 'Firebase';
  }

  getPriority(): number {
    return 3;
  }
}

class MonitoringInitializer implements IServiceInitializer {
  async initialize(): Promise<void> {
    const enableSentry = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_SENTRY
    );

    if (enableSentry) {
      initializeMonitoring();
    }
  }

  getName(): string {
    return 'Monitoring';
  }

  getPriority(): number {
    return 4;
  }
}

class SecurityInitializer implements IServiceInitializer {
  async initialize(): Promise<void> {
    const enableJailbreakDetection = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_JAILBREAK_DETECTION
    );

    if (enableJailbreakDetection || !__DEV__) {
      await initializeSecurity();
    }
  }

  getName(): string {
    return 'Security';
  }

  getPriority(): number {
    return 5;
  }
}

class ApiInitializer implements IServiceInitializer {
  async initialize(): Promise<void> {
    // Token manager is a singleton, no initialization needed

    // Configure rate limiter
    const enableRateLimiting = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_RATE_LIMITING
    );

    if (enableRateLimiting) {
      rateLimiter.configure(defaultRateLimitRules);
    }
  }

  getName(): string {
    return 'API Services';
  }

  getPriority(): number {
    return 6;
  }
}

// Main app initializer
export class AppInitializer {
  private static instance: AppInitializer;
  private initializers: IServiceInitializer[] = [];
  private initialized = false;

  private constructor() {
    // Register all initializers
    this.registerInitializer(new StorageInitializer());
    this.registerInitializer(new FeatureFlagInitializer());
    this.registerInitializer(new FirebaseInitializer());
    this.registerInitializer(new MonitoringInitializer());
    this.registerInitializer(new SecurityInitializer());
    this.registerInitializer(new ApiInitializer());
  }

  static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }

  registerInitializer(initializer: IServiceInitializer): void {
    this.initializers.push(initializer);
    // Sort by priority
    this.initializers.sort((a, b) => a.getPriority() - b.getPriority());
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('App already initialized');
      return;
    }

    console.log('Starting app initialization...');

    for (const initializer of this.initializers) {
      try {
        console.log(`Initializing ${initializer.getName()}...`);
        const startTime = Date.now();

        await initializer.initialize();

        const duration = Date.now() - startTime;
        console.log(`✓ ${initializer.getName()} initialized in ${duration}ms`);
      } catch (error) {
        console.error(`✗ Failed to initialize ${initializer.getName()}:`, error);
        throw new Error(
          `Failed to initialize ${initializer.getName()}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    this.initialized = true;
    console.log('App initialization completed successfully');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
