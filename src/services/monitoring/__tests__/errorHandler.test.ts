import { ErrorHandler, ErrorSeverity } from '../errorHandler';
import { sentryService } from '../sentry';
import { Alert } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

// Mock dependencies
jest.mock('../sentry');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    recordError: jest.fn(),
  }),
}));

// Mock global ErrorUtils
global.ErrorUtils = {
  setGlobalHandler: jest.fn(),
  getGlobalHandler: jest.fn(),
};

describe('ErrorHandler', () => {
  let instance: ErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (ErrorHandler as any).instance = undefined;
    instance = ErrorHandler.getInstance();

    // Mock console methods
    global.console.error = jest.fn();

    // Mock sentry
    (sentryService.captureException as jest.Mock).mockImplementation(() => {});
    (sentryService.addBreadcrumb as jest.Mock).mockImplementation(() => {});

    // Mock crashlytics
    const mockCrashlytics = crashlytics();
    (mockCrashlytics.recordError as jest.Mock).mockImplementation(() => {});
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createError', () => {
    it('should create error with message and code', () => {
      const error = instance.createError('Test error', 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should create error with options', () => {
      const error = instance.createError('Test error', 'TEST_ERROR', {
        severity: ErrorSeverity.HIGH,
        userMessage: 'Something went wrong',
        context: { userId: '123' },
        recoverable: false,
      });

      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.userMessage).toBe('Something went wrong');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.recoverable).toBe(false);
    });

    it('should use default values when options not provided', () => {
      const error = instance.createError('Test error', 'TEST_ERROR');

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.userMessage).toBe('Test error');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('handle', () => {
    it('should log error to console', () => {
      const error = new Error('Test error');
      instance.handle(error);

      expect(console.error).toHaveBeenCalledWith('Error handled:', expect.any(Object));
    });

    it('should capture exception in sentry', () => {
      const error = new Error('Test error');
      instance.handle(error);

      expect(sentryService.captureException).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: ErrorSeverity.MEDIUM,
            code: 'UNKNOWN',
            recoverable: 'true',
          }),
        }),
      );
    });

    it('should record error in crashlytics', () => {
      const error = new Error('Test error');
      instance.handle(error);

      const mockCrashlytics = crashlytics();
      expect(mockCrashlytics.recordError).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should show user alert when showAlert is true and userMessage exists', () => {
      const error = instance.createError('Test error', 'TEST_ERROR', {
        userMessage: 'Custom user message',
      });

      instance.handle(error, true);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Custom user message',
        expect.any(Array),
        { cancelable: false },
      );
    });

    it('should not show alert when showAlert is false', () => {
      const error = instance.createError('Test error', 'TEST_ERROR', {
        userMessage: 'Custom user message',
      });

      instance.handle(error, false);

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should handle network errors', () => {
      const error = new Error('Network request failed');
      instance.handle(error);

      expect(sentryService.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NETWORK_ERROR',
          userMessage: 'Connection error. Please check your internet.',
        }),
        expect.any(Object),
      );
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      instance.handle(error);

      expect(sentryService.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TIMEOUT',
          userMessage: 'Request timed out. Please try again.',
        }),
        expect.any(Object),
      );
    });

    it('should handle app errors with existing properties', () => {
      const error = instance.createError('App error', 'APP_ERROR', {
        severity: ErrorSeverity.CRITICAL,
        context: { action: 'login' },
      });

      instance.handle(error);

      expect(sentryService.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: ErrorSeverity.CRITICAL,
            code: 'APP_ERROR',
          }),
          extra: { action: 'login' },
        }),
      );
    });
  });

  describe('handleAsync', () => {
    it('should handle resolved promises', async () => {
      const result = await instance.handleAsync(Promise.resolve('success'));
      expect(result).toBe('success');
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle rejected promises', async () => {
      const error = new Error('Async error');
      const result = await instance.handleAsync(Promise.reject(error));

      expect(console.error).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return fallback value on error', async () => {
      const error = new Error('Async error');
      const result = await instance.handleAsync(
        Promise.reject(error),
        { fallback: 'default' },
      );

      expect(result).toBe('default');
    });

    it('should add context to errors', async () => {
      const error = new Error('Async error');
      await instance.handleAsync(
        Promise.reject(error),
        { context: { operation: 'fetchData' } },
      );

      expect(sentryService.captureException).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          extra: { operation: 'fetchData' },
        }),
      );
    });

    it('should respect showAlert option', async () => {
      const error = instance.createError('Async error', 'ASYNC_ERROR', {
        userMessage: 'Failed to load data',
      });

      await instance.handleAsync(
        Promise.reject(error),
        { showAlert: true },
      );

      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('setupGlobalHandlers', () => {
    it('should setup global error handler', () => {
      instance.setupGlobalHandlers();

      expect(global.ErrorUtils.setGlobalHandler).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should handle fatal errors', () => {
      let errorHandler: Function;
      (global.ErrorUtils.setGlobalHandler as jest.Mock).mockImplementation(handler => {
        errorHandler = handler;
      });

      instance.setupGlobalHandlers();

      const fatalError = new Error('Fatal error');
      errorHandler!(fatalError, true);

      expect(sentryService.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FATAL_ERROR',
          severity: ErrorSeverity.CRITICAL,
          recoverable: false,
        }),
        expect.any(Object),
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'A critical error occurred. Please restart the app.',
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('should handle non-fatal errors', () => {
      let errorHandler: Function;
      (global.ErrorUtils.setGlobalHandler as jest.Mock).mockImplementation(handler => {
        errorHandler = handler;
      });

      instance.setupGlobalHandlers();

      const error = new Error('Non-fatal error');
      errorHandler!(error, false);

      expect(console.error).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should call original handler if exists', () => {
      const originalHandler = jest.fn();
      (global.ErrorUtils.getGlobalHandler as jest.Mock).mockReturnValue(originalHandler);

      let errorHandler: Function;
      (global.ErrorUtils.setGlobalHandler as jest.Mock).mockImplementation(handler => {
        errorHandler = handler;
      });

      instance.setupGlobalHandlers();

      const error = new Error('Test error');
      errorHandler!(error, false);

      expect(originalHandler).toHaveBeenCalledWith(error, false);
    });
  });

  describe('Alert callback', () => {
    it('should add breadcrumb when user acknowledges error', () => {
      const error = instance.createError('Test error', 'TEST_ERROR', {
        userMessage: 'Error occurred',
      });

      instance.handle(error, true);

      // Get the OK button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const okButton = buttons[0];

      // Call the onPress callback
      okButton.onPress();

      expect(sentryService.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User acknowledged error',
        category: 'ui',
        data: { errorCode: 'TEST_ERROR' },
      });
    });
  });
});

