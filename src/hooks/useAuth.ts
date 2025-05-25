import { useEffect, useState, useCallback } from 'react';
import { authService, AuthUser } from '../services/firebase/auth';
import { tokenManager } from '../services/auth/tokenManager';
import { errorHandler } from '../services/monitoring';
import { analyticsService } from '../services/firebase/analytics';
import { sentryService } from '../services/monitoring';

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async authUser => {
      try {
        if (authUser) {
          setUser(authUser);

          const firebaseUser = authService.getCurrentUser();
          if (firebaseUser) {
            const idToken = await firebaseUser.getIdToken();
            const idTokenResult = await firebaseUser.getIdTokenResult();

            await tokenManager.saveTokens({
              accessToken: idToken,
              refreshToken: idToken,
              expiresAt: new Date(idTokenResult.expirationTime).getTime(),
              userId: authUser.uid,
            });
          }

          await analyticsService.setUserId(authUser.uid);
          sentryService.setUser({
            id: authUser.uid,
            email: authUser.email || undefined,
          });
        } else {
          setUser(null);
          await tokenManager.clearTokens();
          await analyticsService.setUserId(null);
          sentryService.setUser(null);
        }
      } catch (err) {
        errorHandler.handle(err as Error);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const authUser = await authService.signIn(email, password);
      await analyticsService.logLogin('email');

      setUser(authUser);
    } catch (err) {
      setError(err as Error);
      errorHandler.handle(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const authUser = await authService.signUp(email, password);
      await analyticsService.logSignUp('email');

      setUser(authUser);
    } catch (err) {
      setError(err as Error);
      errorHandler.handle(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await authService.signOut();
      await tokenManager.clearTokens();

      setUser(null);
    } catch (err) {
      setError(err as Error);
      errorHandler.handle(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      await authService.resetPassword(email);
    } catch (err) {
      setError(err as Error);
      errorHandler.handle(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await currentUser.reload();
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          emailVerified: currentUser.emailVerified,
        });
      }
    } catch (err) {
      errorHandler.handle(err as Error);
    }
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshUser,
  };
};
