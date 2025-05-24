import {calculateScore, isGameOver, getNextLevel} from '../gameUtils';

describe('gameUtils', () => {
  describe('calculateScore', () => {
    it('should calculate score based on pizzas delivered and time bonus', () => {
      const score = calculateScore({
        pizzasDelivered: 10,
        timeRemaining: 30,
        difficulty: 'medium',
      });
      expect(score).toBe(195); // (10 pizzas * 10 + 30 time bonus) * 1.5 multiplier
    });

    it('should apply difficulty multipliers correctly', () => {
      const easyScore = calculateScore({
        pizzasDelivered: 5,
        timeRemaining: 20,
        difficulty: 'easy',
      });
      const hardScore = calculateScore({
        pizzasDelivered: 5,
        timeRemaining: 20,
        difficulty: 'hard',
      });
      expect(hardScore).toBeGreaterThan(easyScore);
    });
  });

  describe('isGameOver', () => {
    it('should return true when all servers are overloaded', () => {
      const servers = [
        {id: '1', load: 100, capacity: 100},
        {id: '2', load: 100, capacity: 100},
      ];
      expect(isGameOver(servers)).toBe(true);
    });

    it('should return false when at least one server has capacity', () => {
      const servers = [
        {id: '1', load: 100, capacity: 100},
        {id: '2', load: 50, capacity: 100},
      ];
      expect(isGameOver(servers)).toBe(false);
    });
  });

  describe('getNextLevel', () => {
    it('should return next level based on current score', () => {
      expect(getNextLevel(0)).toBe(1);
      expect(getNextLevel(100)).toBe(2);
      expect(getNextLevel(500)).toBe(3);
    });
  });
});
