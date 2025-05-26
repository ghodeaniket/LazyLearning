export * from './encryption';
export * from './sessionManager';
export * from './validation';

import { encryptionService } from './encryption';

export const initializeSecurity = async (): Promise<void> => {
  try {
    // Initialize encryption services
    await encryptionService.initialize();

    console.log('Security services initialized');
  } catch (error) {
    console.error('Failed to initialize security:', error);
    throw error;
  }
};

