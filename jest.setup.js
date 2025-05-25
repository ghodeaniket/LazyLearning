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
  const mockFieldValue = {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    delete: jest.fn(() => 'field-delete'),
    increment: jest.fn((n) => `increment-${n}`),
    arrayUnion: jest.fn((arr) => `array-union-${arr}`),
    arrayRemove: jest.fn((arr) => `array-remove-${arr}`),
  };

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
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    })),
    FieldValue: mockFieldValue,
  };

  mockFirestore.CACHE_SIZE_UNLIMITED = 1048576;

  const mockDefault = () => mockFirestore;
  mockDefault.FieldValue = mockFieldValue;

  return {
    __esModule: true,
    default: mockDefault,
    FieldValue: mockFieldValue,
  };
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

jest.mock('@react-native-firebase/crashlytics', () => {
  const mockCrashlytics = {
    setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
    recordError: jest.fn(),
    log: jest.fn(),
    setUserId: jest.fn(),
    setAttribute: jest.fn(),
  };
  return {
    __esModule: true,
    default: () => mockCrashlytics,
  };
});

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
    encrypt: jest.fn(() => ({toString: () => 'encrypted-data'})),
    decrypt: jest.fn(() => ({toString: () => 'decrypted-data'})),
  },
  HmacSHA256: jest.fn(() => ({toString: () => 'hmac-signature'})),
  SHA256: jest.fn(() => ({toString: () => 'sha256-hash'})),
  PBKDF2: jest.fn(() => ({toString: () => 'pbkdf2-hash'})),
  lib: {
    WordArray: {
      random: jest.fn(() => ({toString: () => 'random-key'})),
    },
  },
  enc: {
    Utf8: {},
    Base64: {
      stringify: jest.fn((wordArray) => 'base64-string'),
    },
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({isConnected: true, isInternetReachable: true, type: 'wifi'})),
  addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getDeviceId: jest.fn(() => 'test-device'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '15.0'),
  getModel: jest.fn(() => 'iPhone'),
  getBrand: jest.fn(() => 'Apple'),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  default: {
    getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
    getDeviceId: jest.fn(() => 'test-device'),
    getSystemName: jest.fn(() => 'iOS'),
    getSystemVersion: jest.fn(() => '15.0'),
    getModel: jest.fn(() => 'iPhone'),
    getBrand: jest.fn(() => 'Apple'),
    isEmulator: jest.fn(() => Promise.resolve(false)),
  },
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map(),
    clone: () => ({
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }),
  })
);

// Mock React Native AppState module differently
Object.defineProperty(require('react-native'), 'AppState', {
  value: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
  },
  writable: true,
});

// Mock jail-monkey
jest.mock('jail-monkey', () => ({
  isJailBroken: () => false,
  isOnExternalStorage: () => false,
  AdbEnabled: () => false,
  isDevelopmentSettingsMode: () => false,
  isDebuggingMode: () => false,
  jailBrokenMessage: () => '',
  canMockLocation: () => false,
  trustFall: () => false,
  isRooted: () => false,
  isDebuggedMode: () => false,
  hookDetected: () => false,
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
