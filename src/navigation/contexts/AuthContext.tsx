import React, { createContext, useReducer, useContext, useEffect, useMemo } from 'react';
import CryptoJS from 'react-native-crypto-js';
import { authService } from '../../services/firebase/auth';
import { tokenManager } from '../../services/auth/tokenManager';
import { encryptedStorage } from '../../services/storage/encryptedStorage';
import type { AuthUser } from '../../types';

interface AuthState {
  isLoading: boolean;
  isSignout: boolean;
  userToken: string | null;
  user: AuthUser | null;
  isOffline: boolean;
}

type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string | null; user: AuthUser | null }
  | { type: 'SIGN_IN'; token: string; user: AuthUser }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_OFFLINE'; isOffline: boolean };

interface AuthContextType {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (prevState: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...prevState,
        userToken: action.token,
        user: action.user,
        isLoading: false,
      };
    case 'SIGN_IN':
      return {
        ...prevState,
        isSignout: false,
        userToken: action.token,
        user: action.user,
        isLoading: false,
      };
    case 'SIGN_OUT':
      return {
        ...prevState,
        isSignout: true,
        userToken: null,
        user: null,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...prevState,
        isLoading: action.isLoading,
      };
    case 'SET_OFFLINE':
      return {
        ...prevState,
        isOffline: action.isOffline,
      };
    default:
      return prevState;
  }
};

// Keys for offline credential storage
const OFFLINE_CREDENTIALS_KEY = 'offline_credentials';
const OFFLINE_USER_KEY = 'offline_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    isSignout: false,
    userToken: null,
    user: null,
    isOffline: false,
  });

  useEffect(() => {
    // Bootstrap async function
    const bootstrapAsync = async () => {
      let userToken: string | null = null;
      let user: AuthUser | null = null;

      try {
        // Try to get token from secure storage
        const tokens = await tokenManager.getTokens();
        if (tokens) {
          // Validate token is still valid
          const isValid = await tokenManager.validateToken();
          if (isValid) {
            userToken = tokens.accessToken;
            // Get user data
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              user = {
                id: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            }
          }
        }
      } catch (e) {
        // Restoring token failed
        console.error('Failed to restore auth token:', e);
      }

      // After restoring token, we may need to validate it
      dispatch({ type: 'RESTORE_TOKEN', token: userToken, user });
    };

    bootstrapAsync();
  }, []);

  const authContext = useMemo(
    () => ({
      state,
      signIn: async (email: string, password: string) => {
        dispatch({ type: 'SET_LOADING', isLoading: true });

        try {
          // Try online authentication first
          const authUser = await authService.signIn(email, password);
          const tokens = await tokenManager.getTokens();

          if (authUser && tokens) {
            const user: AuthUser = {
              id: authUser.uid,
              email: authUser.email || email,
              displayName: authUser.displayName || '',
              photoURL: authUser.photoURL || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Save credentials for offline use
            await encryptedStorage.set(OFFLINE_CREDENTIALS_KEY, {
              email,
              passwordHash: await hashPassword(password),
            });
            await encryptedStorage.set(OFFLINE_USER_KEY, user);

            dispatch({ type: 'SIGN_IN', token: tokens.accessToken, user });
          }
        } catch (error: any) {
          // Check if we're offline
          if (error.code === 'auth/network-request-failed') {
            // Try offline authentication
            try {
              const savedCredentials = await encryptedStorage.get<any>(OFFLINE_CREDENTIALS_KEY);
              const savedUser = await encryptedStorage.get<AuthUser>(OFFLINE_USER_KEY);

              if (savedCredentials && savedUser) {
                // Verify credentials match
                if (savedCredentials.email === email && await verifyPassword(password, savedCredentials.passwordHash)) {
                  dispatch({ type: 'SET_OFFLINE', isOffline: true });
                  dispatch({ type: 'SIGN_IN', token: 'offline-token', user: savedUser });
                  return;
                }
              }
            } catch {
              // Offline auth failed
            }

            throw new Error('No internet connection. Please try again later.');
          }

          dispatch({ type: 'SET_LOADING', isLoading: false });
          throw error;
        }
      },

      signUp: async (email: string, password: string, displayName: string) => {
        dispatch({ type: 'SET_LOADING', isLoading: true });

        try {
          const authUser = await authService.signUp(email, password);

          if (authUser) {
            // Update display name
            await authService.updateProfile({ displayName });

            const tokens = await tokenManager.getTokens();
            const user: AuthUser = {
              id: authUser.uid,
              email: authUser.email || email,
              displayName,
              photoURL: authUser.photoURL || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Save for offline use
            await encryptedStorage.set(OFFLINE_CREDENTIALS_KEY, {
              email,
              passwordHash: await hashPassword(password),
            });
            await encryptedStorage.set(OFFLINE_USER_KEY, user);

            dispatch({ type: 'SIGN_IN', token: tokens?.accessToken || '', user });
          }
        } catch (error) {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          throw error;
        }
      },

      signOut: async () => {
        dispatch({ type: 'SET_LOADING', isLoading: true });

        try {
          await authService.signOut();
          await tokenManager.clearTokens();
          // Don't clear offline credentials - user might want to login offline later
          dispatch({ type: 'SIGN_OUT' });
        } catch (error) {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        // Password reset requires online connection
        if (state.isOffline) {
          throw new Error('Password reset requires an internet connection');
        }

        await authService.resetPassword(email);
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Password hashing functions using CryptoJS
const HASH_SALT = 'LazyLearner2025'; // In production, use a random salt per user

async function hashPassword(password: string): Promise<string> {
  // For MVP, we'll store password encrypted
  // In production, use a proper hashing library like bcrypt
  const encrypted = CryptoJS.AES.encrypt(password, HASH_SALT).toString();
  return encrypted;
}

async function verifyPassword(password: string, encryptedPassword: string): Promise<boolean> {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, HASH_SALT).toString(CryptoJS.enc.Utf8);
    return decrypted === password;
  } catch {
    return false;
  }
}
