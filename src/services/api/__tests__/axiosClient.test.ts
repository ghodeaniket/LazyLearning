import MockAdapter from 'axios-mock-adapter';
import { axiosClient } from '../axiosClient';
import { tokenManager } from '../../auth/tokenManager';
import { rateLimiter } from '../rateLimiter';
import { errorHandler } from '../../monitoring';
// Removed imports for deleted security modules
import Config from 'react-native-config';

// Mock dependencies
jest.mock('../../auth/tokenManager');
jest.mock('../rateLimiter');
jest.mock('../../monitoring');
// Removed mocks for deleted security modules
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://api.test.com',
  DEVELOPMENT: 'false',
}));

describe('axiosClient', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axiosClient);
    jest.clearAllMocks();

    // Setup default mocks
    (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('test-token');
    (tokenManager.refreshToken as jest.Mock).mockResolvedValue(true);
    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue(true);
    // Security mocks removed - not needed for MVP
    (errorHandler.handle as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  describe('request interceptors', () => {
    it('should add auth token to requests', async () => {
      mock.onGet('/test').reply(200, { data: 'test' });

      await axiosClient.get('/test');

      expect(tokenManager.getAccessToken).toHaveBeenCalled();
      expect(mock.history.get[0].headers?.Authorization).toBe('Bearer test-token');
    });

    it('should not add auth token when skipAuth is true', async () => {
      mock.onGet('/public').reply(200, { data: 'public' });

      await axiosClient.get('/public', { skipAuth: true });

      expect(tokenManager.getAccessToken).not.toHaveBeenCalled();
      expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
    });

    it('should check rate limits', async () => {
      mock.onGet('/test').reply(200, { data: 'test' });

      await axiosClient.get('/test');

      expect(rateLimiter.checkLimit).toHaveBeenCalledWith('/test', undefined);
    });

    it('should block rate limited requests', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue(false);

      await expect(axiosClient.get('/test')).rejects.toThrow('Rate limit exceeded');
      expect(mock.history.get.length).toBe(0);
    });

    // Request signing test removed - feature deleted

    // Security headers test removed - feature deleted
  });

  describe('response interceptors', () => {
    it('should handle successful responses', async () => {
      mock.onGet('/test').reply(200, { data: 'success' });

      const response = await axiosClient.get('/test');

      expect(response.data).toEqual({ data: 'success' });
      expect(errorHandler.handle).not.toHaveBeenCalled();
    });

    it('should handle 401 errors and refresh token', async () => {
      // First request fails with 401
      mock.onGet('/test').replyOnce(401);
      // After token refresh, retry succeeds
      mock.onGet('/test').replyOnce(200, { data: 'success' });

      const response = await axiosClient.get('/test');

      expect(tokenManager.refreshToken).toHaveBeenCalled();
      expect(response.data).toEqual({ data: 'success' });
    });

    it('should fail when token refresh fails', async () => {
      (tokenManager.refreshToken as jest.Mock).mockResolvedValue(false);
      mock.onGet('/test').reply(401);

      await expect(axiosClient.get('/test')).rejects.toThrow();
      expect(errorHandler.handle).toHaveBeenCalled();
    });

    it('should not refresh token when skipAuth is true', async () => {
      mock.onGet('/public').reply(401);

      await expect(axiosClient.get('/public', { skipAuth: true })).rejects.toThrow();
      expect(tokenManager.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mock.onGet('/test').networkError();

      await expect(axiosClient.get('/test')).rejects.toThrow();
      expect(errorHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NETWORK_ERROR',
        }),
        true
      );
    });

    it('should handle timeout errors', async () => {
      mock.onGet('/test').timeout();

      await expect(axiosClient.get('/test')).rejects.toThrow();
      expect(errorHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TIMEOUT_ERROR',
        }),
        true
      );
    });

    it('should handle validation errors (400)', async () => {
      mock.onPost('/test').reply(400, {
        errors: [{ field: 'email', message: 'Invalid email' }],
      });

      await expect(axiosClient.post('/test', {})).rejects.toThrow();
      expect(errorHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
        true
      );
    });

    it('should handle server errors (500)', async () => {
      mock.onGet('/test').reply(500, { error: 'Internal server error' });

      await expect(axiosClient.get('/test')).rejects.toThrow();
      expect(errorHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SERVER_ERROR',
        }),
        false
      );
    });
  });

  describe('custom config options', () => {
    it('should handle custom timeout', async () => {
      mock.onGet('/slow').reply(200, { data: 'slow' });

      await axiosClient.get('/slow', { timeout: 5000 });

      expect(mock.history.get[0].timeout).toBe(5000);
    });

    it('should handle custom headers', async () => {
      mock.onGet('/test').reply(200, { data: 'test' });

      await axiosClient.get('/test', {
        headers: { 'X-Custom': 'value' },
      });

      expect(mock.history.get[0].headers).toMatchObject({
        'X-Custom': 'value',
      });
    });

    it('should handle custom base URL', async () => {
      mock.onGet('https://other.com/test').reply(200, { data: 'test' });

      await axiosClient.get('/test', {
        baseURL: 'https://other.com',
      });

      expect(mock.history.get[0].url).toBe('/test');
      expect(mock.history.get[0].baseURL).toBe('https://other.com');
    });
  });

  describe('request methods', () => {
    it('should support GET requests', async () => {
      mock.onGet('/users').reply(200, [{ id: 1, name: 'Test' }]);

      const response = await axiosClient.get('/users');

      expect(response.data).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should support POST requests', async () => {
      mock.onPost('/users').reply(201, { id: 2, name: 'New User' });

      const response = await axiosClient.post('/users', { name: 'New User' });

      expect(response.data).toEqual({ id: 2, name: 'New User' });
      expect(mock.history.post[0].data).toBe(JSON.stringify({ name: 'New User' }));
    });

    it('should support PUT requests', async () => {
      mock.onPut('/users/1').reply(200, { id: 1, name: 'Updated' });

      const response = await axiosClient.put('/users/1', { name: 'Updated' });

      expect(response.data).toEqual({ id: 1, name: 'Updated' });
    });

    it('should support DELETE requests', async () => {
      mock.onDelete('/users/1').reply(204);

      const response = await axiosClient.delete('/users/1');

      expect(response.status).toBe(204);
    });

    it('should support PATCH requests', async () => {
      mock.onPatch('/users/1').reply(200, { id: 1, name: 'Patched' });

      const response = await axiosClient.patch('/users/1', { name: 'Patched' });

      expect(response.data).toEqual({ id: 1, name: 'Patched' });
    });
  });

  describe('development mode', () => {
    beforeEach(() => {
      (Config as any).DEVELOPMENT = 'true';
    });

    afterEach(() => {
      (Config as any).DEVELOPMENT = 'false';
    });

    it('should log requests in development mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mock.onGet('/test').reply(200, { data: 'test' });

      await axiosClient.get('/test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Request:'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});

