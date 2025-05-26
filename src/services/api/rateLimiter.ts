import { encryptedStorage } from '../storage';
import { errorHandler, ErrorSeverity } from '../monitoring';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

type RateLimitRule = {
  endpoint: string | RegExp;
  config: RateLimitConfig;
};

export class RateLimiter {
  private static instance: RateLimiter;
  private rules: RateLimitRule[] = [];
  private cache: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  private constructor() {
    this.startCleanupTask();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  configure(rules: RateLimitRule[]): void {
    this.rules = rules;
  }

  async checkLimit(endpoint: string, userId?: string): Promise<boolean> {
    const rule = this.findMatchingRule(endpoint);
    if (!rule) {
      return true;
    }

    const key = this.generateKey(endpoint, userId, rule.config.keyPrefix);
    const entry = await this.getEntry(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      await this.setEntry(key, {
        count: 1,
        resetTime: now + rule.config.windowMs,
      });
      return true;
    }

    if (entry.count >= rule.config.maxRequests) {
      const waitTime = Math.ceil((entry.resetTime - now) / 1000);

      errorHandler.handle(
        errorHandler.createError(
          `Rate limit exceeded. Try again in ${waitTime} seconds`,
          'RATE_LIMIT_EXCEEDED',
          {
            severity: ErrorSeverity.LOW,
            userMessage: `Too many requests. Please wait ${waitTime} seconds.`,
            context: {
              endpoint,
              waitTime,
              resetTime: entry.resetTime,
            },
          },
        ),
        true,
      );

      return false;
    }

    await this.setEntry(key, {
      count: entry.count + 1,
      resetTime: entry.resetTime,
    });

    return true;
  }

  async getRemainingRequests(
    endpoint: string,
    userId?: string,
  ): Promise<number | null> {
    const rule = this.findMatchingRule(endpoint);
    if (!rule) {
      return null;
    }

    const key = this.generateKey(endpoint, userId, rule.config.keyPrefix);
    const entry = await this.getEntry(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return rule.config.maxRequests;
    }

    return Math.max(0, rule.config.maxRequests - entry.count);
  }

  async getResetTime(
    endpoint: string,
    userId?: string,
  ): Promise<number | null> {
    const rule = this.findMatchingRule(endpoint);
    if (!rule) {
      return null;
    }

    const key = this.generateKey(endpoint, userId, rule.config.keyPrefix);
    const entry = await this.getEntry(key);

    return entry?.resetTime || null;
  }

  async reset(endpoint?: string, userId?: string): Promise<void> {
    if (!endpoint) {
      await encryptedStorage.clear();
      this.cache.clear();
      return;
    }

    const rule = this.findMatchingRule(endpoint);
    if (!rule) {
      return;
    }

    const key = this.generateKey(endpoint, userId, rule.config.keyPrefix);
    await encryptedStorage.remove(key, { encrypted: false });
    this.cache.delete(key);
  }

  private findMatchingRule(endpoint: string): RateLimitRule | null {
    return (
      this.rules.find(rule => {
        if (typeof rule.endpoint === 'string') {
          return rule.endpoint === endpoint;
        }
        return rule.endpoint.test(endpoint);
      }) || null
    );
  }

  private generateKey(
    endpoint: string,
    userId?: string,
    prefix?: string,
  ): string {
    const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    const parts = [
      prefix || 'rate_limit',
      sanitizedEndpoint,
      userId || 'anonymous',
    ];
    return parts.join('_');
  }

  private async getEntry(key: string): Promise<RateLimitEntry | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    const stored = await encryptedStorage.get<RateLimitEntry>(
      key,
      { encrypted: false },
    );

    if (stored) {
      this.cache.set(key, stored);
    }

    return stored;
  }

  private async setEntry(
    key: string,
    entry: RateLimitEntry,
  ): Promise<void> {
    this.cache.set(key, entry);

    await encryptedStorage.set(key, entry, {
      encrypted: false,
      expiresIn: entry.resetTime - Date.now(),
    });
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.resetTime) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
  }
}

export const rateLimiter = RateLimiter.getInstance();

export const defaultRateLimitRules: RateLimitRule[] = [
  {
    endpoint: /^\/api\/auth\/(login|register)$/,
    config: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    },
  },
  {
    endpoint: /^\/api\/auth\/reset-password$/,
    config: {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    },
  },
  {
    endpoint: /^\/api\/game\/submit-answer$/,
    config: {
      maxRequests: 60,
      windowMs: 60 * 1000,
    },
  },
  {
    endpoint: /^\/api\/game\/hint$/,
    config: {
      maxRequests: 10,
      windowMs: 5 * 60 * 1000,
    },
  },
  {
    endpoint: /^\/api\//,
    config: {
      maxRequests: 100,
      windowMs: 60 * 1000,
    },
  },
];
