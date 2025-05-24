import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';

// Import reducers (to be added)
// import authReducer from '@features/auth/authSlice';
// import gameReducer from '@features/game/gameSlice';
// import learningReducer from '@features/learning/learningSlice';

export const store = configureStore({
  reducer: {
    // auth: authReducer,
    // game: gameReducer,
    // learning: learningReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
