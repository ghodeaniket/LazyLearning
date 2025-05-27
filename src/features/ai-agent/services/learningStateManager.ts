import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConceptNode,
  LearningPath,
  LearningSession,
  LearningStateSnapshot,
  ProgressMetrics,
  SessionFeedback,
  UserPreferences,
} from '../types/learningState';

export class LearningStateManager {
  private userId: string;
  private state: LearningStateSnapshot;
  private currentSession?: LearningSession;
  private storageKey: string;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = `learning_state_${userId}`;
    this.state = this.createInitialState();
  }

  async initialize(): Promise<void> {
    try {
      const savedState = await AsyncStorage.getItem(this.storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.state = this.deserializeState(parsed);
      } else {
        this.state = this.createInitialState();
        await this.saveSnapshot();
      }
    } catch (error) {
      console.error('Failed to load learning state:', error);
      this.state = this.createInitialState();
    }
  }

  private createInitialState(): LearningStateSnapshot {
    const now = new Date();
    return {
      userId: this.userId,
      path: {
        id: `path-${Date.now()}`,
        userId: this.userId,
        currentConceptId: '',
        completedConcepts: [],
        upcomingConcepts: [],
        totalProgress: 0,
        createdAt: now,
        updatedAt: now,
      },
      preferences: {
        preferredDifficulty: 'medium',
        learningPace: 'normal',
        visualLearning: true,
        audioEnabled: true,
        sessionDuration: 30,
        dailyGoal: 3,
      },
      recentSessions: [],
      knowledgeGraph: {
        concepts: new Map(),
        edges: new Map(),
        levels: new Map(),
      },
      timestamp: now,
    };
  }

  async getCurrentState(): Promise<LearningStateSnapshot> {
    return { ...this.state };
  }

  async getCurrentPath(): Promise<LearningPath> {
    return { ...this.state.path };
  }

  async getConceptById(conceptId: string): Promise<ConceptNode | undefined> {
    return this.state.knowledgeGraph.concepts.get(conceptId);
  }

  async markConceptCompleted(
    conceptId: string,
    mastery: number
  ): Promise<void> {
    const concept = this.state.knowledgeGraph.concepts.get(conceptId);
    if (!concept) {return;}

    concept.mastery = mastery;
    concept.completedAt = new Date();
    concept.attempts++;

    if (!this.state.path.completedConcepts.includes(conceptId)) {
      this.state.path.completedConcepts.push(conceptId);
    }

    this.state.path.upcomingConcepts = this.state.path.upcomingConcepts.filter(
      id => id !== conceptId
    );

    await this.updateCurrentConcept();
    await this.updateProgress();
    await this.saveSnapshot();
  }

  private async updateCurrentConcept(): Promise<void> {
    const nextConcept = await this.getNextConcept();
    if (nextConcept) {
      this.state.path.currentConceptId = nextConcept.id;
    }
  }

  private async updateProgress(): Promise<void> {
    const total = this.state.knowledgeGraph.concepts.size;
    const completed = this.state.path.completedConcepts.length;
    this.state.path.totalProgress = total > 0 ? (completed / total) * 100 : 0;
    this.state.path.updatedAt = new Date();
  }

  async getNextConcept(): Promise<ConceptNode | undefined> {
    const concepts = Array.from(this.state.knowledgeGraph.concepts.values());
    const completed = new Set(this.state.path.completedConcepts);

    const available = concepts.filter(concept => {
      if (completed.has(concept.id)) {return false;}
      return concept.prerequisites.every(prereq => completed.has(prereq));
    });

    if (available.length === 0) {return undefined;}

    available.sort((a, b) => {
      const diffPref = this.getDifficultyScore(this.state.preferences.preferredDifficulty);
      const aDiff = Math.abs(a.difficulty - diffPref);
      const bDiff = Math.abs(b.difficulty - diffPref);
      return aDiff - bDiff;
    });

    return available[0];
  }

  private getDifficultyScore(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 3;
      case 'medium': return 5;
      case 'hard': return 8;
    }
  }

  async initializeKnowledgeGraph(concepts: ConceptNode[]): Promise<void> {
    this.state.knowledgeGraph.concepts.clear();
    this.state.knowledgeGraph.edges.clear();
    this.state.knowledgeGraph.levels.clear();

    for (const concept of concepts) {
      this.state.knowledgeGraph.concepts.set(concept.id, concept);

      const level = concept.difficulty;
      if (!this.state.knowledgeGraph.levels.has(level)) {
        this.state.knowledgeGraph.levels.set(level, []);
      }
      this.state.knowledgeGraph.levels.get(level)!.push(concept.id);

      for (const prereq of concept.prerequisites) {
        if (!this.state.knowledgeGraph.edges.has(prereq)) {
          this.state.knowledgeGraph.edges.set(prereq, []);
        }
        this.state.knowledgeGraph.edges.get(prereq)!.push(concept.id);
      }
    }

    const firstConcept = await this.getNextConcept();
    if (firstConcept) {
      this.state.path.currentConceptId = firstConcept.id;
      this.state.path.upcomingConcepts = concepts
        .filter(c => c.id !== firstConcept.id)
        .map(c => c.id);
    }

    await this.saveSnapshot();
  }

  async startSession(): Promise<LearningSession> {
    this.currentSession = {
      id: `session-${Date.now()}`,
      userId: this.userId,
      startTime: new Date(),
      conceptsCovered: [],
      averageResponseTime: 0,
      correctResponses: 0,
      totalResponses: 0,
      feedback: [],
    };

    return { ...this.currentSession };
  }

  async endSession(): Promise<LearningSession> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.endTime = new Date();

    const totalTime = this.currentSession.feedback.reduce(
      (sum, f) => sum + f.timeSpent, 0
    );
    this.currentSession.averageResponseTime =
      this.currentSession.feedback.length > 0
        ? totalTime / this.currentSession.feedback.length
        : 0;

    this.state.recentSessions.unshift({ ...this.currentSession });
    if (this.state.recentSessions.length > 10) {
      this.state.recentSessions = this.state.recentSessions.slice(0, 10);
    }

    const session = { ...this.currentSession };
    this.currentSession = undefined;

    await this.saveSnapshot();
    return session;
  }

  async getCurrentSession(): Promise<LearningSession | undefined> {
    return this.currentSession ? { ...this.currentSession } : undefined;
  }

  async recordFeedback(feedback: SessionFeedback): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.feedback.push(feedback);
    this.currentSession.totalResponses++;

    if (feedback.success) {
      this.currentSession.correctResponses++;
    }

    if (!this.currentSession.conceptsCovered.includes(feedback.conceptId)) {
      this.currentSession.conceptsCovered.push(feedback.conceptId);
    }
  }

  async updatePreferences(preferences: UserPreferences): Promise<void> {
    this.state.preferences = { ...preferences };
    await this.saveSnapshot();
  }

  async getProgressMetrics(): Promise<ProgressMetrics> {
    const concepts = Array.from(this.state.knowledgeGraph.concepts.values());
    const completed = concepts.filter(c => c.completedAt !== undefined);

    const totalMastery = concepts.reduce((sum, c) => sum + c.mastery, 0);
    const averageMastery = concepts.length > 0 ? totalMastery / concepts.length : 0;

    const strongConcepts = concepts
      .filter(c => c.mastery >= 80)
      .map(c => c.id);

    const needsReview = concepts
      .filter(c => c.mastery > 0 && c.mastery < 70)
      .map(c => c.id);

    const totalTime = this.state.recentSessions.reduce((sum, session) => {
      if (session.startTime && session.endTime) {
        const duration = new Date(session.endTime).getTime() -
                        new Date(session.startTime).getTime();
        return sum + duration / 60000; // Convert to minutes
      }
      return sum;
    }, 0);

    return {
      totalConcepts: concepts.length,
      completedConcepts: completed.length,
      averageMastery,
      streakDays: this.calculateStreak(),
      totalTimeSpent: totalTime,
      preferredTimeOfDay: this.calculatePreferredTime(),
      strongestConcepts: strongConcepts,
      conceptsNeedingReview: needsReview,
    };
  }

  private calculateStreak(): number {
    // Simplified streak calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const hasSession = this.state.recentSessions.some(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });

      if (!hasSession) {break;}

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private calculatePreferredTime(): string {
    if (this.state.recentSessions.length === 0) {return 'morning';}

    const hourCounts = new Map<number, number>();

    for (const session of this.state.recentSessions) {
      const hour = new Date(session.startTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    const avgHour = Array.from(hourCounts.entries())
      .reduce((sum, [hour, count]) => sum + hour * count, 0) /
      this.state.recentSessions.length;

    if (avgHour < 12) {return 'morning';}
    if (avgHour < 17) {return 'afternoon';}
    return 'evening';
  }

  async getRecommendedConcepts(count: number): Promise<ConceptNode[]> {
    const concepts = Array.from(this.state.knowledgeGraph.concepts.values());
    const completed = new Set(this.state.path.completedConcepts);

    const available = concepts.filter(concept => {
      if (completed.has(concept.id)) {return false;}
      return concept.prerequisites.every(prereq => completed.has(prereq));
    });

    const targetDifficulty = this.getDifficultyScore(
      this.state.preferences.preferredDifficulty
    );

    available.sort((a, b) => {
      const aDiff = Math.abs(a.difficulty - targetDifficulty);
      const bDiff = Math.abs(b.difficulty - targetDifficulty);

      if (aDiff !== bDiff) {return aDiff - bDiff;}

      return a.attempts - b.attempts;
    });

    return available.slice(0, count);
  }

  async getRelatedConcepts(conceptId: string): Promise<ConceptNode[]> {
    const related = new Set<string>();

    const dependents = this.state.knowledgeGraph.edges.get(conceptId) || [];
    dependents.forEach(id => related.add(id));

    const concept = this.state.knowledgeGraph.concepts.get(conceptId);
    if (concept) {
      concept.prerequisites.forEach(id => related.add(id));
    }

    return Array.from(related)
      .map(id => this.state.knowledgeGraph.concepts.get(id))
      .filter((c): c is ConceptNode => c !== undefined);
  }

  async findLearningPath(fromId: string, toId: string): Promise<string[]> {
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [
      { id: fromId, path: [fromId] },
    ];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === toId) {return path;}
      if (visited.has(id)) {continue;}

      visited.add(id);

      const edges = this.state.knowledgeGraph.edges.get(id) || [];
      for (const nextId of edges) {
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, path: [...path, nextId] });
        }
      }
    }

    return [];
  }

  async saveSnapshot(): Promise<void> {
    try {
      const serialized = this.serializeState(this.state);
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to save learning state:', error);
    }
  }

  async exportUserData(): Promise<any> {
    return {
      state: this.serializeState(this.state),
      sessions: this.state.recentSessions,
      exportedAt: new Date().toISOString(),
    };
  }

  private serializeState(state: LearningStateSnapshot): any {
    return {
      ...state,
      knowledgeGraph: {
        concepts: Array.from(state.knowledgeGraph.concepts.entries()),
        edges: Array.from(state.knowledgeGraph.edges.entries()),
        levels: Array.from(state.knowledgeGraph.levels.entries()),
      },
    };
  }

  private deserializeState(data: any): LearningStateSnapshot {
    return {
      ...data,
      path: {
        ...data.path,
        createdAt: new Date(data.path.createdAt),
        updatedAt: new Date(data.path.updatedAt),
      },
      knowledgeGraph: {
        concepts: new Map(data.knowledgeGraph.concepts),
        edges: new Map(data.knowledgeGraph.edges),
        levels: new Map(data.knowledgeGraph.levels),
      },
      timestamp: new Date(data.timestamp),
      recentSessions: data.recentSessions.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
      })),
    };
  }
}
