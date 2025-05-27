import { LearningStateManager } from '../services/learningStateManager';
import {
  ConceptNode,
  UserPreferences,
  SessionFeedback,
} from '../types/learningState';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('LearningStateManager', () => {
  let manager: LearningStateManager;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new LearningStateManager(mockUserId);
  });

  describe('initialization', () => {
    it('should load existing state from storage', async () => {
      const mockState = {
        userId: mockUserId,
        path: {
          id: 'path-1',
          userId: mockUserId,
          currentConceptId: 'concept-1',
          completedConcepts: [],
          upcomingConcepts: ['concept-2', 'concept-3'],
          totalProgress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockState)
      );

      await manager.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        `learning_state_${mockUserId}`
      );
    });

    it('should create new state if none exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await manager.initialize();

      const state = await manager.getCurrentState();
      expect(state.userId).toBe(mockUserId);
      expect(state.path).toBeDefined();
      expect(state.preferences).toBeDefined();
    });
  });

  describe('concept progression', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.initializeKnowledgeGraph([
        {
          id: 'concept-1',
          name: 'Concept 1',
          description: 'First concept',
          difficulty: 1,
          prerequisites: [],
          mastery: 0,
          attempts: 0,
        },
        {
          id: 'concept-2',
          name: 'Concept 2',
          description: 'Second concept',
          difficulty: 2,
          prerequisites: [],
          mastery: 0,
          attempts: 0,
        },
      ]);
    });

    it('should mark concept as completed', async () => {
      const conceptId = 'concept-1';

      await manager.markConceptCompleted(conceptId, 85);

      const concept = await manager.getConceptById(conceptId);
      expect(concept?.mastery).toBe(85);
      expect(concept?.completedAt).toBeDefined();
    });

    it('should update learning path when concept is completed', async () => {
      const conceptId = 'concept-1';

      await manager.markConceptCompleted(conceptId, 90);

      const path = await manager.getCurrentPath();
      expect(path.completedConcepts).toContain(conceptId);
      expect(path.currentConceptId).not.toBe(conceptId);
    });

    it('should calculate next concept based on prerequisites', async () => {
      await manager.initializeKnowledgeGraph([
        {
          id: 'basic-1',
          name: 'Basic Concept 1',
          description: 'Introduction',
          difficulty: 1,
          prerequisites: [],
          mastery: 0,
          attempts: 0,
        },
        {
          id: 'intermediate-1',
          name: 'Intermediate Concept 1',
          description: 'Building on basics',
          difficulty: 5,
          prerequisites: ['basic-1'],
          mastery: 0,
          attempts: 0,
        },
      ]);

      const nextConcept = await manager.getNextConcept();
      expect(nextConcept?.id).toBe('basic-1');
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should start a new session', async () => {
      const session = await manager.startSession();

      expect(session.userId).toBe(mockUserId);
      expect(session.startTime).toBeDefined();
      expect(session.conceptsCovered).toEqual([]);
    });

    it('should end session and calculate metrics', async () => {
      await manager.startSession();

      await manager.recordFeedback({
        timestamp: new Date(),
        conceptId: 'concept-1',
        userAction: 'answer',
        success: true,
        timeSpent: 30,
        hints: 0,
      });

      const endedSession = await manager.endSession();

      expect(endedSession.endTime).toBeDefined();
      expect(endedSession.correctResponses).toBe(1);
      expect(endedSession.totalResponses).toBe(1);
    });

    it('should track session feedback', async () => {
      await manager.startSession();

      const feedback: SessionFeedback = {
        timestamp: new Date(),
        conceptId: 'concept-1',
        userAction: 'answer',
        success: false,
        timeSpent: 45,
        hints: 2,
      };

      await manager.recordFeedback(feedback);

      const session = await manager.getCurrentSession();
      expect(session?.feedback).toHaveLength(1);
      expect(session?.feedback[0]).toEqual(feedback);
    });
  });

  describe('preferences management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should update user preferences', async () => {
      const newPreferences: UserPreferences = {
        preferredDifficulty: 'hard',
        learningPace: 'fast',
        visualLearning: true,
        audioEnabled: false,
        sessionDuration: 45,
        dailyGoal: 5,
      };

      await manager.updatePreferences(newPreferences);

      const state = await manager.getCurrentState();
      expect(state.preferences).toEqual(newPreferences);
    });

    it('should persist preferences to storage', async () => {
      const newPreferences: UserPreferences = {
        preferredDifficulty: 'medium',
        learningPace: 'normal',
        visualLearning: true,
        audioEnabled: true,
        sessionDuration: 30,
        dailyGoal: 3,
      };

      await manager.updatePreferences(newPreferences);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('progress tracking', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.initializeKnowledgeGraph([
        {
          id: 'concept-1',
          name: 'Concept 1',
          description: 'First concept',
          difficulty: 1,
          prerequisites: [],
          mastery: 80,
          attempts: 5,
          completedAt: new Date(),
        },
        {
          id: 'concept-2',
          name: 'Concept 2',
          description: 'Second concept',
          difficulty: 2,
          prerequisites: [],
          mastery: 60,
          attempts: 3,
        },
        {
          id: 'concept-3',
          name: 'Concept 3',
          description: 'Third concept',
          difficulty: 3,
          prerequisites: ['concept-1'],
          mastery: 0,
          attempts: 0,
        },
      ]);
    });

    it('should calculate progress metrics', async () => {
      const metrics = await manager.getProgressMetrics();

      expect(metrics.totalConcepts).toBe(3);
      expect(metrics.completedConcepts).toBe(1);
      expect(metrics.averageMastery).toBeCloseTo(46.67, 1);
    });

    it('should identify concepts needing review', async () => {
      const metrics = await manager.getProgressMetrics();

      expect(metrics.conceptsNeedingReview).toContain('concept-2');
      expect(metrics.strongestConcepts).toContain('concept-1');
    });

    it('should recommend concepts based on difficulty preference', async () => {
      await manager.updatePreferences({
        preferredDifficulty: 'easy',
        learningPace: 'slow',
        visualLearning: true,
        audioEnabled: true,
        sessionDuration: 30,
        dailyGoal: 2,
      });

      const recommendations = await manager.getRecommendedConcepts(3);

      expect(recommendations).toHaveLength(2); // Only 2 uncompleted concepts
      // With easy preference (score 3), concept-2 (difficulty 2) should come first
      expect(recommendations[0].id).toBe('concept-2');
    });
  });

  describe('knowledge graph operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should build concept relationships', async () => {
      const concepts: ConceptNode[] = [
        {
          id: 'a',
          name: 'A',
          description: 'Concept A',
          difficulty: 1,
          prerequisites: [],
          mastery: 0,
          attempts: 0,
        },
        {
          id: 'b',
          name: 'B',
          description: 'Concept B',
          difficulty: 2,
          prerequisites: ['a'],
          mastery: 0,
          attempts: 0,
        },
        {
          id: 'c',
          name: 'C',
          description: 'Concept C',
          difficulty: 3,
          prerequisites: ['a', 'b'],
          mastery: 0,
          attempts: 0,
        },
      ];

      await manager.initializeKnowledgeGraph(concepts);

      const related = await manager.getRelatedConcepts('a');
      expect(related).toHaveLength(2);
      expect(related.map(c => c.id)).toContain('b');
      expect(related.map(c => c.id)).toContain('c');
    });

    it('should find learning paths between concepts', async () => {
      await manager.initializeKnowledgeGraph([
        {
          id: 'start',
          name: 'Start',
          description: 'Starting point',
          difficulty: 1,
          prerequisites: [],
          mastery: 100,
          attempts: 1,
          completedAt: new Date(),
        },
        {
          id: 'middle',
          name: 'Middle',
          description: 'Middle concept',
          difficulty: 2,
          prerequisites: ['start'],
          mastery: 0,
          attempts: 0,
        },
        {
          id: 'end',
          name: 'End',
          description: 'End goal',
          difficulty: 3,
          prerequisites: ['middle'],
          mastery: 0,
          attempts: 0,
        },
      ]);

      const path = await manager.findLearningPath('start', 'end');
      expect(path).toEqual(['start', 'middle', 'end']);
    });
  });

  describe('persistence and recovery', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should save state snapshot', async () => {
      await manager.saveSnapshot();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `learning_state_${mockUserId}`,
        expect.any(String)
      );
    });

    it('should recover from corrupted state', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      await manager.initialize();

      const state = await manager.getCurrentState();
      expect(state).toBeDefined();
      expect(state.userId).toBe(mockUserId);
    });

    it('should export user data', async () => {
      const exportedData = await manager.exportUserData();

      expect(exportedData).toHaveProperty('state');
      expect(exportedData).toHaveProperty('sessions');
      expect(exportedData).toHaveProperty('exportedAt');
    });
  });
});
