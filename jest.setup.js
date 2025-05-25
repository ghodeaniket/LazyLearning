/* eslint-env jest */
// Jest setup file
import '@testing-library/jest-native/extend-expect';

// Mock React Native modules that aren't transformed in tests
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
    GestureHandlerRootView: View,
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const inset = {top: 0, right: 0, bottom: 0, left: 0};
  return {
    SafeAreaProvider: ({children}) => children,
    SafeAreaConsumer: ({children}) => children(inset),
    SafeAreaView: ({children}) => children,
    useSafeAreaInsets: () => inset,
  };
});

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Firebase modules
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
  FirebaseError: Error,
}));

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: null,
  settings: {appVerificationDisabledForTesting: false},
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = () => ({
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
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    })),
  });
  mockFirestore.CACHE_SIZE_UNLIMITED = 1048576;
  mockFirestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  };
  return mockFirestore;
});

jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn(() => jest.fn()),
  useEmulator: jest.fn(),
}));

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  logScreenView: jest.fn(),
  logLogin: jest.fn(),
  logSignUp: jest.fn(),
  logLevelStart: jest.fn(),
  logLevelEnd: jest.fn(),
  logScore: jest.fn(),
  logPurchase: jest.fn(),
  setAnalyticsCollectionEnabled: jest.fn(),
}));

jest.mock('@react-native-firebase/crashlytics', () => () => ({
  setCrashlyticsCollectionEnabled: jest.fn(),
  recordError: jest.fn(),
  log: jest.fn(),
  setUserId: jest.fn(),
  setAttribute: jest.fn(),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  configureScope: jest.fn(),
  startTransaction: jest.fn(() => ({finish: jest.fn()})),
  Scope: jest.fn(),
  ReactNativeTracing: jest.fn(),
  reactNavigationIntegration: jest.fn(),
  SeverityLevel: {
    Fatal: 'fatal',
    Error: 'error',
    Warning: 'warning',
    Info: 'info',
    Debug: 'debug',
  },
}));

// Mock other dependencies
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

jest.mock('react-native-crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({toString: () => 'encrypted'})),
    decrypt: jest.fn(() => ({toString: () => 'decrypted'})),
  },
  lib: {
    WordArray: {
      random: jest.fn(() => ({toString: () => 'random-key'})),
    },
  },
  enc: {
    Utf8: {},
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({isConnected: true})),
}));

jest.mock('react-native-config', () => ({
  FIREBASE_API_KEY: 'test-api-key',
  FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: '123456',
  FIREBASE_APP_ID: 'test-app-id',
  SENTRY_DSN: 'https://test@sentry.io/123456',
  API_BASE_URL: 'https://api.test.com',
  API_TIMEOUT: '30000',
  ENV: 'test',
}));

// Silence console warnings in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
