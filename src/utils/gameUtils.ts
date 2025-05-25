// import {DifficultyLevel} from '@types';

type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface ScoreCalculationParams {
  pizzasDelivered: number;
  timeRemaining: number;
  difficulty: DifficultyLevel;
}

interface Server {
  id: string;
  load: number;
  capacity: number;
}

const DIFFICULTY_MULTIPLIERS: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

const POINTS_PER_PIZZA = 10;
const TIME_BONUS_MULTIPLIER = 1;

export const calculateScore = ({
  pizzasDelivered,
  timeRemaining,
  difficulty,
}: ScoreCalculationParams): number => {
  const baseScore = pizzasDelivered * POINTS_PER_PIZZA;
  const timeBonus = timeRemaining * TIME_BONUS_MULTIPLIER;
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty];

  return Math.floor((baseScore + timeBonus) * multiplier);
};

export const isGameOver = (servers: Server[]): boolean => {
  return servers.every(server => server.load >= server.capacity);
};

export const getNextLevel = (currentScore: number): number => {
  if (currentScore >= 500) {return 3;}
  if (currentScore >= 100) {return 2;}
  return 1;
};
