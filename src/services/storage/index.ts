export * from './encryptedStorage';
export * from './securePreferences';

import { encryptedStorage } from './encryptedStorage';

export const initializeStorage = async (): Promise<void> => {
  await encryptedStorage.initialize();
  console.log('Storage services initialized');
};
