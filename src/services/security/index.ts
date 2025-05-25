export * from './headers';
export * from './requestSigning';
export * from './certificatePinning';
export * from './encryption';
export * from './deviceFingerprint';
export * from './jailbreakDetection';
export * from './sessionManager';
export * from './validation';
export * from './biometricAuth';

import { requestSigning } from './requestSigning';
import { encryptionService } from './encryption';
import { deviceFingerprint } from './deviceFingerprint';
import { jailbreakDetection } from './jailbreakDetection';

export const initializeSecurity = async (): Promise<void> => {
  try {
    // Initialize encryption services
    await requestSigning.initialize();
    await encryptionService.initialize();

    // Get device fingerprint
    await deviceFingerprint.getFingerprint();

    // Check device security
    const securityCheck = await jailbreakDetection.performSecurityCheck();
    if (!__DEV__ && (securityCheck.isJailbroken || securityCheck.isRooted)) {
      await jailbreakDetection.handleSecurityViolation(securityCheck);
      throw new Error('Device security check failed');
    }

    console.log('Security services initialized');
  } catch (error) {
    console.error('Failed to initialize security:', error);
    throw error;
  }
};
