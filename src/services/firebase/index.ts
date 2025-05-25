export * from './config';
export * from './auth';
export * from './firestore';
export * from './functions';
export * from './analytics';

import { initializeFirebase, validateFirebaseConfig } from './config';
import crashlytics from '@react-native-firebase/crashlytics';

export const initializeFirebaseServices = async (): Promise<void> => {
  try {
    if (!validateFirebaseConfig()) {
      throw new Error('Invalid Firebase configuration');
    }

    initializeFirebase();

    if (__DEV__) {
      await crashlytics().setCrashlyticsCollectionEnabled(false);
    } else {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
    }

    console.log('Firebase services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
};
