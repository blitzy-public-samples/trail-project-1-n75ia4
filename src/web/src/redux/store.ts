/**
 * @fileoverview Redux store configuration with enhanced security, performance optimization,
 * and comprehensive state management features for the task management application.
 * @version 1.0.0
 */

import { 
  configureStore, 
  combineReducers, 
  getDefaultMiddleware,
  createListenerMiddleware 
} from '@reduxjs/toolkit'; // v2.0.0
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'; // v6.0.0
import storage from 'redux-persist/lib/storage';
import thunk from 'redux-thunk'; // v3.0.0

// Import reducers
import authReducer from './auth/authSlice';
import projectReducer from './project/projectSlice';
import taskReducer from './task/taskSlice';
import userReducer from './user/userSlice';

// Create listener middleware for side effects
const listenerMiddleware = createListenerMiddleware();

/**
 * Persistence configuration with security measures
 */
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'user'], // Only persist essential state
  blacklist: ['_persist', 'errors', 'loadingStates'], // Never persist sensitive/temporary data
  timeout: 1000, // Timeout for persistence operations
  serialize: true,
  writeFailHandler: (err: Error) => {
    console.error('Redux persist write failed:', err);
    // Implement error reporting here
  }
};

/**
 * Combined reducers with domain separation
 */
const rootReducer = combineReducers({
  auth: authReducer,
  projects: projectReducer,
  tasks: taskReducer,
  users: userReducer
});

/**
 * Type definition for the complete Redux state
 */
export type RootState = ReturnType<typeof rootReducer>;

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = () => (next: any) => (action: any) => {
  const start = performance.now();
  const result = next(action);
  const end = performance.now();
  const duration = end - start;

  if (duration > 16) { // Log slow actions (taking more than one frame)
    console.warn(`Slow action ${action.type}: ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Security middleware for action validation
 */
const securityMiddleware = () => (next: any) => (action: any) => {
  // Validate action structure
  if (!action || typeof action !== 'object' || !action.type) {
    console.error('Invalid action structure:', action);
    return next(action);
  }

  // Sanitize action payload
  if (action.payload) {
    action.payload = JSON.parse(JSON.stringify(action.payload));
  }

  return next(action);
};

/**
 * Error boundary middleware
 */
const errorBoundaryMiddleware = () => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Error in reducer for action:', action, error);
    // Implement error reporting here
    return undefined;
  }
};

/**
 * Configure and create the Redux store with enhanced features
 */
export const configureAppStore = (preloadedState = {}) => {
  const persistedReducer = persistReducer(persistConfig, rootReducer);

  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        warnAfter: 128
      },
      thunk: true,
      immutableCheck: { warnAfter: 128 }
    }).concat([
      thunk,
      listenerMiddleware.middleware,
      performanceMiddleware,
      securityMiddleware,
      errorBoundaryMiddleware
    ]),
    preloadedState,
    devTools: process.env.NODE_ENV !== 'production' && {
      name: 'Task Management System',
      trace: true,
      traceLimit: 25
    },
    enhancers: []
  });

  // Enable hot reloading in development
  if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept(
      ['./auth/authSlice', './project/projectSlice', './task/taskSlice', './user/userSlice'],
      () => {
        store.replaceReducer(persistedReducer);
      }
    );
  }

  return store;
};

// Create store instance
export const store = configureAppStore();

// Create persistor for state persistence
export const persistor = persistStore(store, null, () => {
  // After rehydration callback
  store.dispatch({ type: 'APP/REHYDRATION_COMPLETED' });
});

// Export store dispatch and state types
export type AppDispatch = typeof store.dispatch;
export type AppStore = ReturnType<typeof configureAppStore>;

// Export store instance and persistor
export default { store, persistor };