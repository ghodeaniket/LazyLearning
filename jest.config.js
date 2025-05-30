module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@constants/(.*)$': '<rootDir>/src/shared/constants/$1',
    '^@assets/(.*)$': '<rootDir>/src/shared/assets/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/__tests__/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 20,    // Temporarily lowered for iterative improvement
      functions: 20,   // Will increase to 60% by Sprint 3
      lines: 20,       // Will increase to 70% by Sprint 3
      statements: 20,  // Gradual improvement approach
    },
  },
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/node_modules'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/ios/',
    '<rootDir>/android/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@react-native-.*|@sentry|@react-native-firebase|@react-native-community|@tanstack|jail-monkey)/)',
  ],
};
