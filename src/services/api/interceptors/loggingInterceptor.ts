import { IRequestInterceptor, IResponseInterceptor, ApiRequestConfig, ApiResponse } from '../apiClientV2';
import { sentryService } from '../../monitoring/sentry';
import { featureFlagService, FeatureFlags } from '../../featureFlags';

export class LoggingRequestInterceptor implements IRequestInterceptor {
  async intercept(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    const enableDebug = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);

    if (enableDebug || __DEV__) {
      console.log(`[API Request] ${config.method || 'GET'} ${config.url || ''}`, {
        headers: config.headers,
        body: config.body,
      });
    }

    sentryService.addBreadcrumb({
      message: 'API Request',
      category: 'api',
      level: 'info',
      data: {
        method: config.method || 'GET',
        url: config.url,
      },
    });

    return config;
  }
}

export class LoggingResponseInterceptor implements IResponseInterceptor {
  async intercept<T>(response: Response, request: ApiRequestConfig): Promise<ApiResponse<T>> {
    const enableDebug = await featureFlagService.isEnabled(FeatureFlags.ENABLE_DEBUG_MODE);

    const contentType = response.headers.get('content-type');
    let data: T | undefined;

    if (contentType?.includes('application/json')) {
      data = await response.clone().json();
    }

    if (enableDebug || __DEV__) {
      console.log(`[API Response] ${request.method || 'GET'} ${response.url}`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      });
    }

    sentryService.addBreadcrumb({
      message: 'API Response',
      category: 'api',
      level: response.ok ? 'info' : 'warning',
      data: {
        method: request.method || 'GET',
        url: response.url,
        status: response.status,
      },
    });

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }
}
