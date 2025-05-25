import {
  initializeFirebaseServices,
  authService,
  firestoreService,
  analyticsService,
} from '../firebase';
import { initializeStorage, encryptedStorage } from '../storage';
import { initializeMonitoring, sentryService } from '../monitoring';
import { tokenManager } from '../auth/tokenManager';
import { apiClient } from '../api';

// Mock all external dependencies
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = () => ({
    currentUser: null,
    settings: { appVerificationDisabledForTesting: false },
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  });
  return mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = () => ({
    settings: jest.fn(),
    collection: jest.fn(),
  });
  mockFirestore.CACHE_SIZE_UNLIMITED = 1048576;
  mockFirestore.FieldValue = {
    serverTimestamp: jest.fn(),
  };
  return mockFirestore;
});

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  logLogin: jest.fn(),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  default: () => ({
    setCrashlyticsCollectionEnabled: jest.fn(),
    recordError: jest.fn(),
    setUserId: jest.fn(),
  }),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  Scope: jest.fn(),
}));

jest.mock('react-native-keychain');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

jest.mock('react-native-config', () => ({
  FIREBASE_API_KEY: 'test-key',
  FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: '123456',
  FIREBASE_APP_ID: 'test-app-id',
  SENTRY_DSN: 'https://test@sentry.io/123456',
  API_BASE_URL: 'https://api.test.com',
}));

global.fetch = jest.fn();

describe('Infrastructure Integration', () => {
  describe('Full Service Initialization', () => {
    it('should initialize all services in correct order', async () => {
      // Initialize services
      await initializeFirebaseServices();
      await initializeStorage();
      initializeMonitoring();

      // Verify all services are initialized
      expect(require('@react-native-firebase/app').initializeApp)
        .toHaveBeenCalled();
      expect(require('@sentry/react-native').init).toHaveBeenCalled();
    });
  });

  describe('Authentication Flow Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle complete sign-in flow', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        getIdToken: jest.fn().mockResolvedValue('test-token'),
        getIdTokenResult: jest.fn().mockResolvedValue({
          token: 'test-token',
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      };

      // Mock auth service
      const mockAuth = require('@react-native-firebase/auth')();
      mockAuth.signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });
      mockAuth.currentUser = mockUser;

      // Mock token manager
      jest.spyOn(tokenManager, 'saveTokens')
        .mockResolvedValue();
      jest.spyOn(tokenManager, 'getTokens')
        .mockResolvedValue({
          accessToken: 'test-token',
          refreshToken: 'test-token',
          expiresAt: Date.now() + 3600000,
          userId: 'test-uid',
        });

      // Sign in
      const result = await authService.signIn(
        'test@example.com',
        'password123',
      );

      // Verify user data
      expect(result.uid).toBe('test-uid');
      expect(result.email).toBe('test@example.com');

      // Verify analytics
      expect(analyticsService.logLogin).toHaveBeenCalledWith('email');

      // Verify Sentry user context
      expect(sentryService.setUser).toHaveBeenCalledWith({
        id: 'test-uid',
        email: 'test@example.com',
      });
    });

    it('should handle sign-out flow', async () => {
      const mockAuth = require('@react-native-firebase/auth')();
      mockAuth.signOut.mockResolvedValue();

      const clearTokensSpy = jest.spyOn(tokenManager, 'clearTokens')
        .mockResolvedValue();

      await authService.signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(clearTokensSpy).toHaveBeenCalled();
      expect(sentryService.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('Data Operations Integration', () => {
    it('should handle secure data storage', async () => {
      // Mock encrypted storage
      jest.spyOn(encryptedStorage, 'set')
        .mockResolvedValue();
      jest.spyOn(encryptedStorage, 'get')
        .mockResolvedValue({ id: '123', name: 'Test' });

      // Store data
      await encryptedStorage.set('user-data', {
        id: '123',
        name: 'Test',
      });

      // Retrieve data
      const retrieved = await encryptedStorage.get('user-data');

      expect(setSpy).toHaveBeenCalled();
      expect(retrieved).toEqual({ id: '123', name: 'Test' });
    });

    it('should handle Firestore operations with error tracking', async () => {
      const mockFirestore = require('@react-native-firebase/firestore')();
      const mockCollection = {
        add: jest.fn().mockRejectedValue({
          code: 'permission-denied',
          message: 'Permission denied',
        }),
      };
      mockFirestore.collection.mockReturnValue(mockCollection);

      // Attempt to create document (should fail)
      await expect(
        firestoreService.create('restricted', { data: 'test' }),
      ).rejects.toThrow('You do not have permission');

      // Verify error was tracked
      const mockCrashlytics = require('@react-native-firebase/crashlytics')();
      expect(mockCrashlytics.recordError).toHaveBeenCalled();
    });
  });

  describe('API Integration with Auth and Rate Limiting', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Mock network info
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({ isConnected: true });

      // Mock token manager
      jest.spyOn(tokenManager, 'getTokens').mockResolvedValue({
        accessToken: 'test-token',
        refreshToken: 'test-token',
        expiresAt: Date.now() + 3600000,
        userId: 'test-uid',
      });

      jest.spyOn(tokenManager, 'getAuthHeaders').mockResolvedValue({
        Authorization: 'Bearer test-token',
      });
    });

    it('should make authenticated API request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ data: 'protected' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.get('/api/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );

      expect(result).toEqual({ data: 'protected' });
    });

    it('should handle token refresh on 401', async () => {
      jest.spyOn(tokenManager, 'refreshTokens')
        .mockResolvedValue({
          accessToken: 'new-token',
          refreshToken: 'new-token',
          expiresAt: Date.now() + 3600000,
          userId: 'test-uid',
        });

      // First request returns 401
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      });

      await expect(apiClient.get('/api/protected'))
        .rejects.toThrow('API Error: 401');
    });
  });

  describe('Error Handling Integration', () => {
    it('should track errors across all services', async () => {
      const error = new Error('Test error');

      // Capture exception through Sentry
      sentryService.captureException(error, {
        userId: 'test-uid',
        tags: { service: 'test' },
      });

      // Verify Sentry captured it
      expect(require('@sentry/react-native').captureException)
        .toHaveBeenCalled();

      // Verify Crashlytics recorded it
      expect(require('@react-native-firebase/crashlytics')().recordError)
        .toHaveBeenCalled();
    });
  });
});
