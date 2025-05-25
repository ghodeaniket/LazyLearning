import Config from 'react-native-config';
import axios from 'axios';
import { encryptedStorage } from '../storage';
import {
  FeatureFlag,
  FeatureFlagConfig,
  IFeatureFlagService,
  IFeatureFlagProvider,
} from './types';

class LocalFeatureFlagProvider implements IFeatureFlagProvider {
  async fetchFlags(): Promise<Record<string, FeatureFlag>> {
    // In a real app, this would fetch from a remote config service
    return {};
  }

  async reportUsage(flagKey: string, userId?: string): Promise<void> {
    // Report feature flag usage for analytics
    console.log(`Feature flag ${flagKey} used by ${userId || 'anonymous'}`);
  }
}

class RemoteFeatureFlagProvider implements IFeatureFlagProvider {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async fetchFlags(): Promise<Record<string, FeatureFlag>> {
    try {
      const response = await axios.get(`${this.apiEndpoint}/feature-flags`, {
        headers: {
          'X-API-Key': Config.FEATURE_FLAG_API_KEY || '',
        },
        timeout: 10000, // 10 second timeout for feature flags
      });

      return response.data.flags || {};
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return {};
    }
  }

  async reportUsage(flagKey: string, userId?: string): Promise<void> {
    try {
      await axios.post(`${this.apiEndpoint}/feature-flags/usage`, {
        flagKey,
        userId,
        timestamp: Date.now(),
      }, {
        headers: {
          'X-API-Key': Config.FEATURE_FLAG_API_KEY || '',
        },
        timeout: 5000, // 5 second timeout for usage reporting
      });
    } catch (error) {
      console.error('Error reporting feature flag usage:', error);
    }
  }
}

export class FeatureFlagService implements IFeatureFlagService {
  private static instance: FeatureFlagService;
  private provider: IFeatureFlagProvider;
  private flags: Record<string, FeatureFlag> = {};
  private overrides: Record<string, boolean> = {};
  private config: FeatureFlagConfig = {
    refreshInterval: 300000, // 5 minutes
    enableCache: true,
    enableRemoteConfig: false,
  };
  private refreshTimer?: NodeJS.Timeout;
  private readonly CACHE_KEY = 'feature_flags_cache';

  private constructor() {
    this.provider = new LocalFeatureFlagProvider();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  async initialize(config?: FeatureFlagConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    // Set up provider based on configuration
    if (this.config.enableRemoteConfig && this.config.apiEndpoint) {
      this.provider = new RemoteFeatureFlagProvider(this.config.apiEndpoint);
    }

    // Load cached flags if caching is enabled
    if (this.config.enableCache) {
      await this.loadCachedFlags();
    }

    // Set default flags
    if (this.config.defaultFlags) {
      Object.entries(this.config.defaultFlags).forEach(([key, enabled]) => {
        this.flags[key] = {
          key,
          enabled,
          description: 'Default flag',
        };
      });
    }

    // Fetch latest flags
    await this.refresh();

    // Set up automatic refresh
    if (this.config.refreshInterval && this.config.enableRemoteConfig) {
      this.startAutoRefresh();
    }
  }

  async isEnabled(flagKey: string, userId?: string): Promise<boolean> {
    // Check overrides first
    if (flagKey in this.overrides) {
      return this.overrides[flagKey];
    }

    const flag = this.flags[flagKey];
    if (!flag) {
      return false;
    }

    // Report usage
    await this.provider.reportUsage(flagKey, userId);

    // Check if user is in targeted users
    if (flag.targetedUsers && userId) {
      if (flag.targetedUsers.includes(userId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && userId) {
      const hash = this.hashUserId(userId);
      const percentage = (hash % 100) + 1;
      return percentage <= flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  async getAllFlags(): Promise<Record<string, FeatureFlag>> {
    return { ...this.flags };
  }

  async refresh(): Promise<void> {
    try {
      const newFlags = await this.provider.fetchFlags();

      // Merge with existing flags
      this.flags = { ...this.flags, ...newFlags };

      // Cache flags if enabled
      if (this.config.enableCache) {
        await this.cacheFlags();
      }
    } catch (error) {
      console.error('Error refreshing feature flags:', error);
    }
  }

  setOverride(flagKey: string, value: boolean): void {
    this.overrides[flagKey] = value;
  }

  clearOverrides(): void {
    this.overrides = {};
  }

  private async loadCachedFlags(): Promise<void> {
    try {
      const cached = await encryptedStorage.get<Record<string, FeatureFlag>>(
        this.CACHE_KEY
      );
      if (cached) {
        this.flags = cached;
      }
    } catch (error) {
      console.error('Error loading cached feature flags:', error);
    }
  }

  private async cacheFlags(): Promise<void> {
    try {
      await encryptedStorage.set(this.CACHE_KEY, this.flags);
    } catch (error) {
      console.error('Error caching feature flags:', error);
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, this.config.refreshInterval!);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  destroy(): void {
    this.stopAutoRefresh();
  }
}

export const featureFlagService = FeatureFlagService.getInstance();
