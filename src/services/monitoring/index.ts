export * from './sentry';
export * from './errorHandler';

import { sentryService } from './sentry';
import { errorHandler } from './errorHandler';

export const initializeMonitoring = (): void => {
  sentryService.initialize();
  errorHandler.setupGlobalHandlers();

  console.log('Monitoring services initialized');
};
