import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import { tokenManager } from '../../services/auth/tokenManager';
import { sessionManager } from '../../services/security/sessionManager';
import { errorHandler } from '../../services/monitoring';
import { axiosClient } from '../../services/api';
import { encryptedStorage } from '../../services/storage';

// Mock dependencies
jest.mock('../../services/auth/tokenManager');
jest.mock('../../services/security/sessionManager');
jest.mock('../../services/monitoring');
jest.mock('../../services/api');
jest.mock('../../services/storage');

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (tokenManager.getAccessToken as jest.Mock).mockResolvedValue(null);
    (tokenManager.setTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.clearTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.refreshToken as jest.Mock).mockResolvedValue(true);
    (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue('refresh-token');
    (sessionManager.createSession as jest.Mock).mockResolvedValue(undefined);
    (sessionManager.clearSession as jest.Mock).mockResolvedValue(undefined);
    (sessionManager.on as jest.Mock).mockImplementation(() => {});
    (axiosClient.post as jest.Mock).mockResolvedValue({ data: {} });
    (encryptedStorage.get as jest.Mock).mockResolvedValue(null);
    (encryptedStorage.set as jest.Mock).mockResolvedValue(undefined);
    (encryptedStorage.remove as jest.Mock).mockResolvedValue(undefined);
    (errorHandler.handle as jest.Mock).mockImplementation(() => {});
  });

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should check authentication on mount', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(tokenManager.getAccessToken).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should set authenticated state when token exists', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('valid-token');
      (encryptedStorage.get as jest.Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should successfully login with email and password', async () => {
      const mockResponse = {
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: { id: '123', email: 'test@example.com' },
        },
      };

      (axiosClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(axiosClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(tokenManager.setTokens).toHaveBeenCalledWith({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(sessionManager.createSession).toHaveBeenCalledWith({
        user: mockResponse.data.user,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockResponse.data.user);
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Invalid credentials');
      (axiosClient.post as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.login('test@example.com', 'wrong-password'))
          .rejects.toThrow('Invalid credentials');
      });

      expect(errorHandler.handle).toHaveBeenCalledWith(mockError, true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.login('invalid-email', 'password'))
          .rejects.toThrow();
      });

      expect(axiosClient.post).not.toHaveBeenCalled();
    });

    it('should validate password requirements', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.login('test@example.com', '123'))
          .rejects.toThrow();
      });

      expect(axiosClient.post).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should successfully register new user', async () => {
      const mockResponse = {
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: { id: '123', email: 'new@example.com', username: 'newuser' },
        },
      };

      (axiosClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register('new@example.com', 'password123', 'newuser');
      });

      expect(axiosClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });

      expect(tokenManager.setTokens).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockResponse.data.user);
    });

    it('should handle registration errors', async () => {
      const mockError = new Error('Email already exists');
      (axiosClient.post as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.register('existing@example.com', 'password123', 'user'))
          .rejects.toThrow('Email already exists');
      });

      expect(errorHandler.handle).toHaveBeenCalledWith(mockError, true);
    });

    it('should validate username format', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.register('test@example.com', 'password123', 'a'))
          .rejects.toThrow();
      });

      expect(axiosClient.post).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      // Setup authenticated state
      const mockUser = { id: '123', email: 'test@example.com' };
      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('valid-token');
      (encryptedStorage.get as jest.Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(sessionManager.clearSession).toHaveBeenCalled();
      expect(encryptedStorage.remove).toHaveBeenCalledWith('user');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = new Error('Logout failed');
      (tokenManager.clearTokens as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(errorHandler.handle).toHaveBeenCalledWith(mockError);
      // Should still clear local state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue('old-refresh-token');
      (axiosClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(axiosClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });

      expect(tokenManager.setTokens).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should logout when refresh fails', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue('old-refresh-token');
      (axiosClient.post as jest.Mock).mockRejectedValue(new Error('Invalid refresh token'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle missing refresh token', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const refreshed = await result.current.refreshToken();
        expect(refreshed).toBe(false);
      });

      expect(axiosClient.post).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const initialUser = { id: '123', email: 'test@example.com' };
      const updatedData = { username: 'newusername' };

      (tokenManager.getAccessToken as jest.Mock).mockResolvedValue('valid-token');
      (encryptedStorage.get as jest.Mock).mockResolvedValue(initialUser);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.updateUser(updatedData);
      });

      expect(encryptedStorage.set).toHaveBeenCalledWith('user', {
        ...initialUser,
        ...updatedData,
      });

      expect(result.current.user).toEqual({
        ...initialUser,
        ...updatedData,
      });
    });

    it('should not update when not authenticated', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.updateUser({ username: 'newname' });
      });

      expect(encryptedStorage.set).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });
});

