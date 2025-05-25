import { configureStore } from '@reduxjs/toolkit';

// Placeholder store configuration
export const store = configureStore({
  reducer: {
    // Add reducers here as features are implemented
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
