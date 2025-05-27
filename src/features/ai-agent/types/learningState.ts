export interface ConceptNode {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1-10
  prerequisites: string[];
  completedAt?: Date;
  mastery: number; // 0-100
  attempts: number;
  lastAttemptAt?: Date;
}

export interface LearningPath {
  id: string;
  userId: string;
  currentConceptId: string;
  completedConcepts: string[];
  upcomingConcepts: string[];
  totalProgress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  preferredDifficulty: 'easy' | 'medium' | 'hard';
  learningPace: 'slow' | 'normal' | 'fast';
  visualLearning: boolean;
  audioEnabled: boolean;
  sessionDuration: number; // minutes
  dailyGoal: number; // concepts per day
}

export interface LearningSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  conceptsCovered: string[];
  averageResponseTime: number;
  correctResponses: number;
  totalResponses: number;
  feedback: SessionFeedback[];
}

export interface SessionFeedback {
  timestamp: Date;
  conceptId: string;
  userAction: string;
  success: boolean;
  timeSpent: number;
  hints: number;
}

export interface KnowledgeGraph {
  concepts: Map<string, ConceptNode>;
  edges: Map<string, string[]>; // conceptId -> related conceptIds
  levels: Map<number, string[]>; // difficulty level -> conceptIds
}

export interface LearningStateSnapshot {
  userId: string;
  path: LearningPath;
  preferences: UserPreferences;
  currentSession?: LearningSession;
  recentSessions: LearningSession[];
  knowledgeGraph: KnowledgeGraph;
  timestamp: Date;
}

export interface ProgressMetrics {
  totalConcepts: number;
  completedConcepts: number;
  averageMastery: number;
  streakDays: number;
  totalTimeSpent: number; // minutes
  preferredTimeOfDay: string;
  strongestConcepts: string[];
  conceptsNeedingReview: string[];
}
