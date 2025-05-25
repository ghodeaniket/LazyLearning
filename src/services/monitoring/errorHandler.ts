import { Alert } from 'react-native';
import { sentryService } from './sentry';
import crashlytics from '@react-native-firebase/crashlytics';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AppError extends Error {
  code?: string;
  severity?: ErrorSeverity;
  userMessage?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: Error | AppError, showAlert: boolean = true): void {
    const appError = this.normalizeError(error);

    console.error('Error handled:', appError);

    sentryService.captureException(appError, {
      tags: {
        severity: appError.severity || ErrorSeverity.MEDIUM,
        code: appError.code || 'UNKNOWN',
        recoverable: String(appError.recoverable !== false),
      },
      extra: appError.context,
    });

    crashlytics().recordError(appError);

    if (showAlert && appError.userMessage) {
      this.showErrorAlert(appError);
    }
  }

  handleAsync<T>(
    promise: Promise<T>,
    options: {
      fallback?: T;
      showAlert?: boolean;
      context?: Record<string, any>;
    } = {},
  ): Promise<T | undefined> {
    return promise.catch(error => {
      const appError = this.normalizeError(error);
      appError.context = { ...appError.context, ...options.context };

      this.handle(appError, options.showAlert);

      return options.fallback;
    });
  }

  createError(
    message: string,
    code: string,
    options: {
      severity?: ErrorSeverity;
      userMessage?: string;
      context?: Record<string, any>;
      recoverable?: boolean;
    } = {},
  ): AppError {
    const error = new Error(message) as AppError;
    error.code = code;
    error.severity = options.severity || ErrorSeverity.MEDIUM;
    error.userMessage = options.userMessage || message;
    error.context = options.context;
    error.recoverable = options.recoverable !== false;

    return error;
  }

  private normalizeError(error: Error | AppError): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    const appError = error as AppError;
    appError.severity = ErrorSeverity.MEDIUM;
    appError.recoverable = true;

    if (error.message.includes('Network request failed')) {
      appError.code = 'NETWORK_ERROR';
      appError.userMessage = 'Connection error. Please check your internet.';
    } else if (error.message.includes('timeout')) {
      appError.code = 'TIMEOUT';
      appError.userMessage = 'Request timed out. Please try again.';
    } else {
      appError.code = 'UNKNOWN';
      appError.userMessage = 'An unexpected error occurred.';
    }

    return appError;
  }

  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'severity' in error;
  }

  private showErrorAlert(error: AppError): void {
    Alert.alert(
      'Error',
      error.userMessage || 'An error occurred',
      [
        {
          text: 'OK',
          onPress: () => {
            sentryService.addBreadcrumb({
              message: 'User acknowledged error',
              category: 'ui',
              data: { errorCode: error.code },
            });
          },
        },
      ],
      { cancelable: false },
    );
  }

  setupGlobalHandlers(): void {
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      if (isFatal) {
        const appError = this.createError(
          error.message,
          'FATAL_ERROR',
          {
            severity: ErrorSeverity.CRITICAL,
            userMessage: 'A critical error occurred. Please restart the app.',
            recoverable: false,
            context: { isFatal: true },
          },
        );

        this.handle(appError, true);
      } else {
        this.handle(error, false);
      }

      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
}

export const errorHandler = ErrorHandler.getInstance();
