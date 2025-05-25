import * as Sentry from '@sentry/react-native';
import Config from 'react-native-config';
import crashlytics from '@react-native-firebase/crashlytics';

export interface ErrorContext {
  userId?: string;
  email?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export class SentryService {
  private static instance: SentryService;
  private initialized = false;

  private constructor() {}

  static getInstance(): SentryService {
    if (!SentryService.instance) {
      SentryService.instance = new SentryService();
    }
    return SentryService.instance;
  }

  initialize(): void {
    if (this.initialized || !Config.SENTRY_DSN) {
      console.log('Sentry not initialized: Missing DSN or already initialized');
      return;
    }

    Sentry.init({
      dsn: Config.SENTRY_DSN,
      environment: Config.ENV || 'development',
      debug: __DEV__,
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
      attachStacktrace: true,
      normalizeDepth: 10,
      beforeSend: (event, hint) => {
        if (__DEV__) {
          console.log('Sentry Event:', event);
        }
        crashlytics().recordError(hint.originalException as Error);
        return event;
      },
      integrations: [
        // React Native tracing will be configured later
      ],
    });

    this.initialized = true;
  }

  setUser(user: { id: string; email?: string; username?: string } | null): void {
    if (!this.initialized) {return;}

    if (user) {
      Sentry.setUser(user);
      crashlytics().setUserId(user.id);
      if (user.email) {
        crashlytics().setAttribute('email', user.email);
      }
    } else {
      Sentry.setUser(null);
      crashlytics().setUserId('');
    }
  }

  captureException(error: Error, context?: ErrorContext): void {
    if (!this.initialized) {
      console.error('Sentry not initialized:', error);
      return;
    }

    const scope = new Sentry.Scope();

    if (context) {
      if (context.userId) {
        scope.setUser({ id: context.userId, email: context.email });
      }

      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
    }

    Sentry.captureException(error, scope);
    crashlytics().recordError(error);
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.initialized) {
      console.log(`[${level}] ${message}`);
      return;
    }

    Sentry.captureMessage(message, level);
    crashlytics().log(message);
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }): void {
    if (!this.initialized) {return;}

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  }

  startTransaction(
    _name: string,
    _operation: string,
  ): any | undefined {
    if (!this.initialized) {return undefined;}

    // Transaction API will be configured later
    return { finish: () => {} };
  }

  setContext(key: string, context: Record<string, any>): void {
    if (!this.initialized) {return;}
    Sentry.setContext(key, context);
  }

  clearScope(): void {
    if (!this.initialized) {return;}
    // Scope clearing will be configured later
  }

  wrap<T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext,
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch(error => {
            this.captureException(error, context);
            throw error;
          });
        }
        return result;
      } catch (error) {
        this.captureException(error as Error, context);
        throw error;
      }
    }) as T;
  }
}

export const sentryService = SentryService.getInstance();
