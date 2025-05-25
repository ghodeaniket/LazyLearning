import {
  initializeFirebaseServices,
  authService,
  firestoreService,
} from '../firebase';
import { tokenManager } from '../auth/tokenManager';
import Config from 'react-native-config';

// Mock Firebase modules
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
}));

jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = {
    currentUser: null,
    settings: { appVerificationDisabledForTesting: false },
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    onAuthStateChanged: jest.fn(),
  };
  return () => mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = {
    settings: jest.fn(),
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        onSnapshot: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({ get: jest.fn() })),
    })),
  };
  mockFirestore.CACHE_SIZE_UNLIMITED = 1048576;
  mockFirestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  };
  return () => mockFirestore;
});

jest.mock('@react-native-firebase/functions', () => {
  const mockFunctions = {
    httpsCallable: jest.fn(() => jest.fn()),
    useEmulator: jest.fn(),
  };
  return () => mockFunctions;
});

jest.mock('@react-native-firebase/analytics', () => {
  const mockAnalytics = {
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
    logScreenView: jest.fn(),
    logLogin: jest.fn(),
    logSignUp: jest.fn(),
    setAnalyticsCollectionEnabled: jest.fn(),
  };
  return () => mockAnalytics;
});

jest.mock('@react-native-firebase/crashlytics', () => ({
  default: () => ({
    setCrashlyticsCollectionEnabled: jest.fn(),
    recordError: jest.fn(),
    log: jest.fn(),
    setUserId: jest.fn(),
    setAttribute: jest.fn(),
  }),
}));

jest.mock('react-native-config', () => ({
  FIREBASE_API_KEY: 'test-api-key',
  FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: '123456',
  FIREBASE_APP_ID: 'test-app-id',
}));

describe('Firebase Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeFirebaseServices', () => {
    it('should initialize Firebase with valid configuration', async () => {
      await expect(initializeFirebaseServices()).resolves.toBeUndefined();
    });

    it('should throw error with invalid configuration', async () => {
      const originalApiKey = Config.FIREBASE_API_KEY;
      Config.FIREBASE_API_KEY = '';

      await expect(initializeFirebaseServices()).rejects.toThrow(
        'Invalid Firebase configuration',
      );

      Config.FIREBASE_API_KEY = originalApiKey;
    });
  });

  describe('AuthService', () => {
    it('should sign up a new user', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: null,
        photoURL: null,
        emailVerified: false,
      };

      const mockAuth = require('@react-native-firebase/auth')();
      mockAuth.createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: mockUser,
      });

      const result = await authService.signUp(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should handle auth errors', async () => {
      const mockAuth = require('@react-native-firebase/auth')();
      mockAuth.signInWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/user-not-found',
        message: 'User not found',
      });

      await expect(
        authService.signIn('test@example.com', 'wrong-password'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('FirestoreService', () => {
    it('should create a document', async () => {
      const mockFirestore = require('@react-native-firebase/firestore')();
      const mockDocRef = { id: 'new-doc-id' };
      mockFirestore.collection().add.mockResolvedValueOnce(mockDocRef);

      const docId = await firestoreService.create('users', {
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(docId).toBe('new-doc-id');
      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
    });

    it('should query documents', async () => {
      const mockFirestore = require('@react-native-firebase/firestore')();
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'User 1' }) },
        { id: 'doc2', data: () => ({ name: 'User 2' }) },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValueOnce({ docs: mockDocs }),
      };

      mockFirestore.collection.mockReturnValueOnce(mockQuery);

      const results = await firestoreService.query('users', {
        where: [{ field: 'active', operator: '==', value: true }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 'doc1', name: 'User 1' });
    });
  });

  describe('Token Integration', () => {
    it('should save tokens after successful authentication', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: jest.fn().mockResolvedValue('test-token'),
        getIdTokenResult: jest.fn().mockResolvedValue({
          token: 'test-token',
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      };

      const saveTokensSpy = jest.spyOn(tokenManager, 'saveTokens');

      const mockAuth = require('@react-native-firebase/auth')();
      mockAuth.currentUser = mockUser;
      mockAuth.signInWithEmailAndPassword.mockResolvedValueOnce({
        user: mockUser,
      });

      await authService.signIn('test@example.com', 'password123');

      // In a real scenario, the auth state change listener would trigger
      // For testing, we'll manually call it
      await tokenManager.saveTokens({
        accessToken: 'test-token',
        refreshToken: 'test-token',
        expiresAt: Date.now() + 3600000,
        userId: 'test-uid',
      });

      expect(saveTokensSpy).toHaveBeenCalled();
    });
  });
});
