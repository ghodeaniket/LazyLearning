// Core type definitions for Lazy Learner app

// Authentication user type (minimal user info)
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Full user type with preferences and progress
export interface User extends AuthUser {
  name: string;
  lastLogin: Date;
  preferences: UserPreferences;
  progress: UserProgress;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  difficultyLevel: DifficultyLevel;
}

export interface UserProgress {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  completedLessons: string[];
  gameStats: GameStats;
}

export interface GameStats {
  pizzaLoadBalancer: {
    highScore: number;
    gamesPlayed: number;
    totalScore: number;
  };
  cacheQuest?: {
    highScore: number;
    gamesPlayed: number;
    totalScore: number;
  };
  databaseDrama?: {
    highScore: number;
    gamesPlayed: number;
    totalScore: number;
  };
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
