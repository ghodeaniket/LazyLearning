import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export class AuthService {
  private static instance: AuthService;
  private authInstance = auth();

  private constructor() {
    this.authInstance.settings.appVerificationDisabledForTesting = __DEV__;
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  getCurrentUser(): FirebaseAuthTypes.User | null {
    return this.authInstance.currentUser;
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await this.authInstance.createUserWithEmailAndPassword(
        email,
        password,
      );
      return this.mapFirebaseUser(userCredential.user);
    } catch (error) {
      throw this.handleAuthError(error as Error);
    }
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await this.authInstance.signInWithEmailAndPassword(
        email,
        password,
      );
      return this.mapFirebaseUser(userCredential.user);
    } catch (error) {
      throw this.handleAuthError(error as Error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authInstance.signOut();
    } catch (error) {
      throw this.handleAuthError(error as Error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.authInstance.sendPasswordResetEmail(email);
    } catch (error) {
      throw this.handleAuthError(error as Error);
    }
  }

  async updateProfile(updates: {
    displayName?: string;
    photoURL?: string;
  }): Promise<void> {
    const user = this.authInstance.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      await user.updateProfile(updates);
    } catch (error) {
      throw this.handleAuthError(error as Error);
    }
  }

  onAuthStateChanged(
    callback: (user: AuthUser | null) => void,
  ): () => void {
    return this.authInstance.onAuthStateChanged(user => {
      callback(user ? this.mapFirebaseUser(user) : null);
    });
  }

  private mapFirebaseUser(user: FirebaseAuthTypes.User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  }

  private handleAuthError(error: Error): Error {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password is too weak',
      'auth/user-not-found': 'User not found',
      'auth/wrong-password': 'Incorrect password',
      'auth/network-request-failed': 'Network error. Please try again',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
    };

    const message = errorMessages[(error as any).code] || error.message;
    return new Error(message);
  }
}

export const authService = AuthService.getInstance();
