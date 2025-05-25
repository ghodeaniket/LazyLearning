import { apiClient, rateLimiter } from '../api';
import { tokenManager } from '../auth/tokenManager';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../auth/tokenManager');
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://api.test.com',
  API_TIMEOUT: '5000',
}));

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
    });
    (tokenManager.getTokens as jest.Mock).mockResolvedValue({
      userId: 'test-user',
    });
    (tokenManager.getAuthHeaders as jest.Mock).mockResolvedValue({
      Authorization: 'Bearer test-token',
    });
  });

  describe('request', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(result).toEqual({ data: 'test' });
    });

    it('should handle POST request with data', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: '123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const postData = { name: 'Test', value: 42 };
      const result = await apiClient.post('/test-endpoint', postData);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        }),
      );

      expect(result).toEqual({ id: '123' });
    });

    it('should handle network offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
      });

      await expect(apiClient.get('/test')).rejects.toThrow(
        'No internet connection',
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ error: 'Not found' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(apiClient.get('/missing')).rejects.toThrow(
        'API Error: 404',
      );
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(resolve, 10000);
        }),
      );

      await expect(apiClient.get('/slow', { timeout: 100 })).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should retry failed requests', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue({ data: 'success' }),
        });

      const result = await apiClient.get('/test', { retries: 2, retryDelay: 10 });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('authentication', () => {
    it('should include auth headers by default', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({}),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await apiClient.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should skip auth when specified', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({}),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await apiClient.get('/public', { skipAuth: true });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });
});

describe('Rate Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter.configure([
      {
        endpoint: '/api/test',
        config: {
          maxRequests: 2,
          windowMs: 1000,
        },
      },
      {
        endpoint: /^\/api\/limited/,
        config: {
          maxRequests: 1,
          windowMs: 5000,
        },
      },
    ]);
  });

  afterEach(async () => {
    await rateLimiter.reset();
  });

  it('should allow requests within limit', async () => {
    const result1 = await rateLimiter.checkLimit('/api/test', 'user1');
    const result2 = await rateLimiter.checkLimit('/api/test', 'user1');

    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it('should block requests exceeding limit', async () => {
    await rateLimiter.checkLimit('/api/test', 'user1');
    await rateLimiter.checkLimit('/api/test', 'user1');

    const result = await rateLimiter.checkLimit('/api/test', 'user1');
    expect(result).toBe(false);
  });

  it('should handle regex patterns', async () => {
    const result1 = await rateLimiter.checkLimit('/api/limited/resource', 'user1');
    const result2 = await rateLimiter.checkLimit('/api/limited/resource', 'user1');

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it('should track limits per user', async () => {
    await rateLimiter.checkLimit('/api/test', 'user1');
    await rateLimiter.checkLimit('/api/test', 'user1');

    const result = await rateLimiter.checkLimit('/api/test', 'user2');
    expect(result).toBe(true);
  });

  it('should reset after window expires', async () => {
    await rateLimiter.checkLimit('/api/test', 'user1');
    await rateLimiter.checkLimit('/api/test', 'user1');

    // Wait for window to expire
    await new Promise<void>(resolve => setTimeout(resolve, 1100));

    const result = await rateLimiter.checkLimit('/api/test', 'user1');
    expect(result).toBe(true);
  });

  it('should get remaining requests', async () => {
    const initial = await rateLimiter.getRemainingRequests('/api/test', 'user1');
    expect(initial).toBe(2);

    await rateLimiter.checkLimit('/api/test', 'user1');

    const remaining = await rateLimiter.getRemainingRequests('/api/test', 'user1');
    expect(remaining).toBe(1);
  });

  it('should handle endpoints without rules', async () => {
    const result = await rateLimiter.checkLimit('/api/unrestricted', 'user1');
    expect(result).toBe(true);

    const remaining = await rateLimiter.getRemainingRequests('/api/unrestricted', 'user1');
    expect(remaining).toBeNull();
  });
});

describe('API Client with Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
    });

    rateLimiter.configure([
      {
        endpoint: '/api/limited',
        config: {
          maxRequests: 1,
          windowMs: 1000,
        },
      },
    ]);
  });

  afterEach(async () => {
    await rateLimiter.reset();
  });

  it('should enforce rate limits on API calls', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // First request should succeed
    await expect(apiClient.get('/api/limited')).resolves.toEqual({ data: 'test' });

    // Second request should be rate limited
    await expect(apiClient.get('/api/limited')).rejects.toThrow('Rate limit exceeded');
  });

  it('should skip rate limit when specified', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await apiClient.get('/api/limited');

    // Second request with skipRateLimit should succeed
    await expect(
      apiClient.get('/api/limited', { skipRateLimit: true }),
    ).resolves.toEqual({ data: 'test' });
  });
});
