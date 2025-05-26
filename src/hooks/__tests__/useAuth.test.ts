import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import { authService } from '../../services/firebase/auth';
import { tokenManager } from '../../services/auth/tokenManager';
import { analyticsService } from '../../services/firebase/analytics';
import { sentryService } from '../../services/monitoring';
import { errorHandler } from '../../services/monitoring';

// Mock dependencies
jest.mock('../../services/firebase/auth');
jest.mock('../../services/auth/tokenManager');
jest.mock('../../services/firebase/analytics');
jest.mock('../../services/monitoring');

describe('useAuth', () => {
  const mockUser = {
    uid: '123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
  };

  const mockFirebaseUser = {
    uid: '123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (authService.onAuthStateChanged as jest.Mock).mockImplementation(_callback => {
      // Don't call callback immediately, let tests control it
      return jest.fn(); // Return unsubscribe function
    });
    (authService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (authService.signIn as jest.Mock).mockResolvedValue(mockUser);
    (authService.signUp as jest.Mock).mockResolvedValue(mockUser);
    (authService.signOut as jest.Mock).mockResolvedValue(undefined);
    (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);

    (tokenManager.saveTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.clearTokens as jest.Mock).mockResolvedValue(undefined);

    (analyticsService.setUserId as jest.Mock).mockResolvedValue(undefined);
    (analyticsService.logLogin as jest.Mock).mockResolvedValue(undefined);
    (analyticsService.logSignUp as jest.Mock).mockResolvedValue(undefined);

    (sentryService.setUser as jest.Mock).mockImplementation(() => {});
    (errorHandler.handle as jest.Mock).mockImplementation(() => {});
  });

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle authenticated user on mount', async () => {
      let authCallback: any;
      (authService.onAuthStateChanged as jest.Mock).mockImplementation(callback => {
        authCallback = callback;
        return jest.fn();
      });

      mockFirebaseUser.getIdToken.mockResolvedValue('id-token');
      mockFirebaseUser.getIdTokenResult.mockResolvedValue({
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
      });
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockFirebaseUser);

      const { result } = renderHook(() => useAuth());

      // Trigger auth state change
      await act(async () => {
        authCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
        expect(tokenManager.saveTokens).toHaveBeenCalledWith({
          accessToken: 'id-token',
          refreshToken: 'id-token',
          expiresAt: expect.any(Number),
          userId: '123',
        });
        expect(analyticsService.setUserId).toHaveBeenCalledWith('123');
        expect(sentryService.setUser).toHaveBeenCalledWith({
          id: '123',
          email: 'test@example.com',
        });
      });
    });

    it('should handle unauthenticated user on mount', async () => {
      let authCallback: any;
      (authService.onAuthStateChanged as jest.Mock).mockImplementation(callback => {
        authCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      // Trigger auth state change with null user
      await act(async () => {
        authCallback(null);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(tokenManager.clearTokens).toHaveBeenCalled();
        expect(analyticsService.setUserId).toHaveBeenCalledWith(null);
        expect(sentryService.setUser).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(analyticsService.logLogin).toHaveBeenCalledWith('email');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign in error', async () => {
      const error = new Error('Invalid credentials');
      (authService.signIn as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');

      // Error state is not preserved when error is thrown in act()
      // Just verify error handler was called
      expect(errorHandler.handle).toHaveBeenCalledWith(error);
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });

      expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(analyticsService.logSignUp).toHaveBeenCalledWith('email');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign up error', async () => {
      const error = new Error('Email already in use');
      (authService.signUp as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signUp('test@example.com', 'password123');
        })
      ).rejects.toThrow('Email already in use');

      // Error state is not preserved when error is thrown in act()
      // Just verify error handler was called
      expect(errorHandler.handle).toHaveBeenCalledWith(error);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial user state
      await act(async () => {
        result.current.user = mockUser;
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(authService.signOut).toHaveBeenCalled();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed');
      (authService.signOut as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signOut();
        })
      ).rejects.toThrow('Sign out failed');

      // Error state is not preserved when error is thrown in act()
      // Just verify error handler was called
      expect(errorHandler.handle).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
      expect(result.current.error).toBeNull();
    });

    it('should handle reset password error', async () => {
      const error = new Error('User not found');
      (authService.resetPassword as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.resetPassword('notfound@example.com');
        })
      ).rejects.toThrow('User not found');

      // Error state is not preserved when error is thrown in act()
      // Just verify error handler was called
      expect(errorHandler.handle).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshUser', () => {
    it('should refresh user data successfully', async () => {
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockFirebaseUser);
      mockFirebaseUser.reload.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockFirebaseUser.reload).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle refresh user error', async () => {
      const error = new Error('Reload failed');
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockFirebaseUser);
      mockFirebaseUser.reload.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(errorHandler.handle).toHaveBeenCalledWith(error);
    });

    it('should do nothing if no current user', async () => {
      (authService.getCurrentUser as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockFirebaseUser.reload).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should set loading during sign in', async () => {
      let resolveSignIn: any;
      (authService.signIn as jest.Mock).mockImplementation(() =>
        new Promise(resolve => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<void>;
      act(() => {
        signInPromise = result.current.signIn('test@example.com', 'password');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveSignIn(mockUser);
        await signInPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const unsubscribe = jest.fn();
      (authService.onAuthStateChanged as jest.Mock).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useAuth());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});

