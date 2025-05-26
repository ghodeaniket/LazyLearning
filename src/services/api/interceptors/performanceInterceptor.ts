import { IRequestInterceptor, IResponseInterceptor, ApiRequestConfig, ApiResponse } from '../apiClientV2';
import { sentryService } from '../../monitoring/sentry';
import { featureFlagService, FeatureFlags } from '../../featureFlags';

interface RequestTiming {
  startTime: number;
  endpoint: string;
  method: string;
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private timings = new Map<string, RequestTiming>();

  private constructor() {}

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  startTracking(requestId: string, endpoint: string, method: string): void {
    this.timings.set(requestId, {
      startTime: Date.now(),
      endpoint,
      method,
    });
  }

  endTracking(requestId: string): { timing: RequestTiming; duration: number } | null {
    const timing = this.timings.get(requestId);
    if (!timing) {
      return null;
    }

    const duration = Date.now() - timing.startTime;
    this.timings.delete(requestId);
    return { timing, duration };
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createRequestId(): string {
    return this.generateRequestId();
  }
}

export class PerformanceRequestInterceptor implements IRequestInterceptor {
  private tracker = PerformanceTracker.getInstance();

  async intercept(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    const enablePerformanceMonitoring = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_PERFORMANCE_MONITORING
    );

    if (enablePerformanceMonitoring) {
      const requestId = this.tracker.createRequestId();

      // Start tracking
      this.tracker.startTracking(
        requestId,
        '', // URL not available in RequestInit
        config.method || 'GET'
      );

      // Add request ID to headers for tracking
      return {
        ...config,
        headers: {
          ...(config.headers as Record<string, string>),
          'X-Request-Id': requestId,
        },
      };
    }

    return config;
  }
}

export class PerformanceResponseInterceptor implements IResponseInterceptor {
  private tracker = PerformanceTracker.getInstance();

  async intercept<T>(response: Response, request: ApiRequestConfig): Promise<ApiResponse<T>> {
    const enablePerformanceMonitoring = await featureFlagService.isEnabled(
      FeatureFlags.ENABLE_PERFORMANCE_MONITORING
    );

    if (enablePerformanceMonitoring) {
      const requestId = (request.headers as Record<string, string>)?.['X-Request-Id'];

      if (requestId) {
        const result = this.tracker.endTracking(requestId);
        if (result) {
          this.logPerformance(result.timing, result.duration, response.status);
        }
      }
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    let data: T | undefined;

    if (contentType?.includes('application/json')) {
      data = await response.clone().json();
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  private logPerformance(timing: RequestTiming, duration: number, status: number): void {
    const performanceData = {
      endpoint: timing.endpoint,
      method: timing.method,
      duration,
      status,
      timestamp: new Date().toISOString(),
    };

    // Log to Sentry
    sentryService.addBreadcrumb({
      message: 'API Performance',
      category: 'performance',
      level: duration > 3000 ? 'warning' : 'info',
      data: performanceData,
    });

    // Log slow requests
    if (duration > 3000) {
      console.warn('[Performance] Slow API request detected:', performanceData);
    }

    // In production, this could send metrics to an analytics service
    if (!__DEV__) {
      // Analytics service would be called here
    }
  }
}
