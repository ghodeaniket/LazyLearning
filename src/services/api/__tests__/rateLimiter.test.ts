import { RateLimiter, defaultRateLimitRules } from '../rateLimiter';
import { encryptedStorage } from '../../storage';
import { errorHandler } from '../../monitoring';

// Mock dependencies
jest.mock('../../storage');
jest.mock('../../monitoring');

describe('RateLimiter', () => {
  let instance: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Reset singleton instance to get a clean state
    RateLimiter.resetInstance();
    instance = RateLimiter.getInstance();

    // Mock storage methods
    (encryptedStorage.get as jest.Mock).mockResolvedValue(null);
    (encryptedStorage.set as jest.Mock).mockResolvedValue(undefined);
    (encryptedStorage.remove as jest.Mock).mockResolvedValue(undefined);
    (encryptedStorage.clear as jest.Mock).mockResolvedValue(undefined);

    // Mock errorHandler
    (errorHandler.handle as jest.Mock).mockImplementation(() => {});
    (errorHandler.createError as jest.Mock).mockImplementation((msg) =>
      new Error(msg)
    );
  });

  afterEach(() => {
    instance.destroy();
    RateLimiter.resetInstance();
    jest.clearAllTimers();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = RateLimiter.getInstance();
      const instance2 = RateLimiter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('configure', () => {
    it('should configure rate limit rules', () => {
      const rules = [
        {
          endpoint: '/api/test',
          config: { maxRequests: 5, windowMs: 60000 },
        },
      ];

      expect(() => instance.configure(rules)).not.toThrow();
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 3, windowMs: 60000 },
        },
      ]);

      const result1 = await instance.checkLimit('/api/test', 'user1');
      const result2 = await instance.checkLimit('/api/test', 'user1');
      const result3 = await instance.checkLimit('/api/test', 'user1');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);

      // Verify storage was called correctly
      expect(encryptedStorage.set).toHaveBeenCalledTimes(3);
    });

    it('should block requests exceeding limit', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 2, windowMs: 60000 },
        },
      ]);

      // Mock storage to return existing entries
      (encryptedStorage.get as jest.Mock)
        .mockResolvedValueOnce(null) // First request
        .mockResolvedValueOnce({ count: 1, resetTime: Date.now() + 60000 }) // Second request
        .mockResolvedValueOnce({ count: 2, resetTime: Date.now() + 60000 }); // Third request

      const result1 = await instance.checkLimit('/api/test', 'user1');
      const result2 = await instance.checkLimit('/api/test', 'user1');
      const result3 = await instance.checkLimit('/api/test', 'user1');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false);
      expect(errorHandler.handle).toHaveBeenCalled();
    });

    it('should allow requests when no matching rule exists', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 1, windowMs: 60000 },
        },
      ]);

      const result = await instance.checkLimit('/api/other-endpoint', 'user1');

      expect(result).toBe(true);
      expect(encryptedStorage.set).not.toHaveBeenCalled();
    });

    it('should handle regex endpoint patterns', async () => {
      // Create a new instance to avoid test pollution
      RateLimiter.resetInstance();
      const freshInstance = RateLimiter.getInstance();

      freshInstance.configure([
        {
          endpoint: /^\/api\/auth\/(login|register)$/,
          config: { maxRequests: 3, windowMs: 60000 },
        },
      ]);

      // Test login endpoint
      const loginResult = await freshInstance.checkLimit('/api/auth/login', 'user123');
      expect(loginResult).toBe(true);

      // Test register endpoint
      const registerResult = await freshInstance.checkLimit('/api/auth/register', 'user456');
      expect(registerResult).toBe(true);

      // Test non-matching endpoint
      const otherResult = await freshInstance.checkLimit('/api/profile/update', 'user789');
      expect(otherResult).toBe(true); // No rule matches, so allowed

      // Verify only the matching endpoints triggered storage
      expect(encryptedStorage.set).toHaveBeenCalledTimes(2);
    });

    it('should track requests per user independently', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 1, windowMs: 60000 },
        },
      ]);

      const user1Result = await instance.checkLimit('/api/test', 'user1');
      const user2Result = await instance.checkLimit('/api/test', 'user2');

      expect(user1Result).toBe(true);
      expect(user2Result).toBe(true);
      expect(encryptedStorage.set).toHaveBeenCalledTimes(2);
    });

    it('should handle anonymous users', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 2, windowMs: 60000 },
        },
      ]);

      const result = await instance.checkLimit('/api/test');

      expect(result).toBe(true);
      expect(encryptedStorage.set).toHaveBeenCalledWith(
        expect.stringContaining('anonymous'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should reset count after window expires', async () => {
      const now = Date.now();
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 1, windowMs: 60000 },
        },
      ]);

      // Mock expired entry
      (encryptedStorage.get as jest.Mock).mockResolvedValueOnce({
        count: 1,
        resetTime: now - 1000, // Expired
      });

      const result = await instance.checkLimit('/api/test', 'user1');

      expect(result).toBe(true);
      expect(encryptedStorage.set).toHaveBeenCalledWith(
        expect.any(String),
        { count: 1, resetTime: expect.any(Number) },
        expect.any(Object)
      );
    });

    it('should use custom key prefix when provided', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: {
            maxRequests: 1,
            windowMs: 60000,
            keyPrefix: 'custom_prefix',
          },
        },
      ]);

      await instance.checkLimit('/api/test', 'user1');

      expect(encryptedStorage.set).toHaveBeenCalledWith(
        expect.stringContaining('custom_prefix'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('getRemainingRequests', () => {
    it('should return remaining requests count', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 3, windowMs: 60000 },
        },
      ]);

      (encryptedStorage.get as jest.Mock).mockResolvedValue({
        count: 2,
        resetTime: Date.now() + 30000,
      });

      const remaining = await instance.getRemainingRequests('/api/test', 'user1');
      expect(remaining).toBe(1);
    });

    it('should return max requests when no requests made', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 5, windowMs: 60000 },
        },
      ]);

      const remaining = await instance.getRemainingRequests('/api/test', 'user1');
      expect(remaining).toBe(5);
    });

    it('should return 0 when limit exceeded', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 2, windowMs: 60000 },
        },
      ]);

      (encryptedStorage.get as jest.Mock).mockResolvedValue({
        count: 3,
        resetTime: Date.now() + 30000,
      });

      const remaining = await instance.getRemainingRequests('/api/test', 'user1');
      expect(remaining).toBe(0);
    });

    it('should return null when no matching rule', async () => {
      const remaining = await instance.getRemainingRequests('/api/unknown', 'user1');
      expect(remaining).toBeNull();
    });
  });

  describe('getResetTime', () => {
    it('should return reset timestamp', async () => {
      const resetTime = Date.now() + 30000;
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 1, windowMs: 60000 },
        },
      ]);

      (encryptedStorage.get as jest.Mock).mockResolvedValue({
        count: 1,
        resetTime,
      });

      const result = await instance.getResetTime('/api/test', 'user1');
      expect(result).toBe(resetTime);
    });

    it('should return null when no entry exists', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 1, windowMs: 60000 },
        },
      ]);

      const result = await instance.getResetTime('/api/test', 'user1');
      expect(result).toBeNull();
    });

    it('should return null when no matching rule', async () => {
      const result = await instance.getResetTime('/api/unknown', 'user1');
      expect(result).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all limits when no endpoint specified', async () => {
      await instance.reset();

      expect(encryptedStorage.clear).toHaveBeenCalled();
    });

    it('should reset specific endpoint and user', async () => {
      instance.configure([
        {
          endpoint: '/api/test',
          config: { maxRequests: 1, windowMs: 60000 },
        },
      ]);

      await instance.reset('/api/test', 'user1');

      expect(encryptedStorage.remove).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit'),
        { encrypted: false }
      );
    });

    it('should handle reset for non-existent endpoint', async () => {
      await expect(instance.reset('/api/unknown', 'user1')).resolves.not.toThrow();
      expect(encryptedStorage.remove).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      // Start the cleanup interval
      (instance as any).startCleanupTask();
      const intervalId = (instance as any).cleanupInterval;

      instance.destroy();

      expect((instance as any).cleanupInterval).toBeUndefined();
      // Verify the interval was cleared (this is implementation detail testing)
      expect(() => clearInterval(intervalId)).not.toThrow();
    });

    it('should handle destroy when no interval exists', () => {
      (instance as any).cleanupInterval = undefined;

      expect(() => instance.destroy()).not.toThrow();
    });
  });

  describe('default rate limit rules', () => {
    it('should have correct structure', () => {
      expect(defaultRateLimitRules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          endpoint: expect.any(RegExp),
          config: expect.objectContaining({
            maxRequests: expect.any(Number),
            windowMs: expect.any(Number),
          }),
        }),
      ]));
    });

    it('should match auth endpoints', () => {
      const authRule = defaultRateLimitRules.find(
        rule => rule.endpoint instanceof RegExp &&
        rule.endpoint.test('/api/auth/login')
      );

      expect(authRule).toBeDefined();
      expect(authRule?.config.maxRequests).toBe(5);
      expect(authRule?.config.windowMs).toBe(15 * 60 * 1000);
    });
  });
});

