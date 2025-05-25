import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

export interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
}

export interface UserProperties {
  userId?: string;
  userType?: 'student' | 'teacher' | 'parent';
  subscriptionLevel?: 'free' | 'premium';
  [key: string]: any;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private analyticsInstance = analytics();

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    try {
      await this.analyticsInstance.logEvent(eventName, params);
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    try {
      await this.analyticsInstance.setUserId(userId);
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    try {
      await this.analyticsInstance.setUserProperties(properties);
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      await this.analyticsInstance.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logLogin(method: string): Promise<void> {
    try {
      await this.analyticsInstance.logLogin({ method });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logSignUp(method: string): Promise<void> {
    try {
      await this.analyticsInstance.logSignUp({ method });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logLevelStart(level: string): Promise<void> {
    try {
      await this.analyticsInstance.logLevelStart({ level });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logLevelEnd(level: string, success: boolean): Promise<void> {
    try {
      await this.analyticsInstance.logLevelEnd({ level, success: success ? '1' : '0' });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logScore(score: number, level?: string, character?: string): Promise<void> {
    try {
      await this.analyticsInstance.logEvent('score', {
        score: score.toString(),
        level,
        character,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async logPurchase(
    value: number,
    currency: string,
    transactionId: string,
    items?: Array<{ item_id: string; item_name: string; price: number }>,
  ): Promise<void> {
    try {
      await this.analyticsInstance.logPurchase({
        value,
        currency,
        transaction_id: transactionId,
        items,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }

  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      await this.analyticsInstance.setAnalyticsCollectionEnabled(enabled);
    } catch (error) {
      console.error('Analytics error:', error);
      crashlytics().recordError(error as Error);
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
