export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: string;
}

export interface ITokenManager {
  setTokens(tokens: AuthTokens): Promise<void>;
  getTokens(): Promise<AuthTokens | null>;
  getAccessToken(): Promise<string | null>;
  refreshTokens(): Promise<AuthTokens | null>;
  clearTokens(): Promise<void>;
  isTokenExpired(): Promise<boolean>;
  getAuthHeaders(): Promise<Record<string, string>>;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime: string | null;
    lastSignInTime: string | null;
  };
}

export interface IAuthService {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  sendPasswordResetEmail(email: string): Promise<void>;
  updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<void>;
}
