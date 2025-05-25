import firebase from '@react-native-firebase/app';
import Config from 'react-native-config';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: Config.FIREBASE_API_KEY || '',
  authDomain: Config.FIREBASE_AUTH_DOMAIN || '',
  projectId: Config.FIREBASE_PROJECT_ID || '',
  storageBucket: Config.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: Config.FIREBASE_APP_ID || '',
  measurementId: Config.FIREBASE_MEASUREMENT_ID,
};

let app: firebase.FirebaseApp;

export const initializeFirebase = (): firebase.FirebaseApp => {
  if (!app) {
    app = firebase.initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseApp = (): firebase.FirebaseApp => {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return app;
};

export const validateFirebaseConfig = (): boolean => {
  const requiredKeys: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  for (const key of requiredKeys) {
    if (!firebaseConfig[key]) {
      console.error(`Missing required Firebase config: ${key}`);
      return false;
    }
  }

  return true;
};

export default firebaseConfig;
