/**
 * @fileoverview Comprehensive test suite for Redux authentication slice with security focus
 * @version 1.0.0
 */

import { configureStore } from '@reduxjs/toolkit'; // v2.0.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals'; // v29.0.0
import authReducer, {
  login,
  logout,
  rotateToken,
  setSecurityMetrics,
  updateTokenRotation,
  selectAuth,
  selectAuthWithSecurity
} from '../../../src/redux/auth/authSlice';
import { AuthState, AuthProvider } from '../../../src/types/auth.types';
import { ApiErrorCode } from '../../../src/types/api.types';
import { authService } from '../../../src/services/auth.service';

// Mock auth service
jest.mock('../../../src/services/auth.service', () => ({
  authService: {
    validateSecurityContext: jest.fn(),
    login: jest.fn(),
    rotateToken: jest.fn()
  }
}));

// Initial test state with security metrics
const initialState: AuthState & {
  securityMetrics: {
    loginAttempts: number;
    lastFailedAttempt: string | null;
    securityChecks: any[];
    tokenRotations: number;
  };
  tokenRotationStatus: {
    lastRotation: string | null;
    nextRotation: string | null;
    rotationInProgress: boolean;
  };
} = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  loading: false,
  error: null,
  lastAuthenticated: null,
  securityMetrics: {
    loginAttempts: 0,
    lastFailedAttempt: null,
    securityChecks: [],
    tokenRotations: 0
  },
  tokenRotationStatus: {
    lastRotation: null,
    nextRotation: null,
    rotationInProgress: false
  }
};

// Configure test store with security middleware
const setupStore = (preloadedState = initialState) => {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: preloadedState },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['auth/login/fulfilled', 'auth/rotateToken/fulfilled']
        }
      })
  });
};

describe('Auth Slice Security Tests', () => {
  let store: ReturnType<typeof setupStore>;

  beforeEach(() => {
    store = setupStore();
    jest.clearAllMocks();
  });

  describe('Initial State Security', () => {
    it('should initialize with secure default state', () => {
      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
      expect(state.securityMetrics.loginAttempts).toBe(0);
      expect(state.tokenRotationStatus.rotationInProgress).toBe(false);
    });

    it('should have proper security metrics structure', () => {
      const state = store.getState().auth;
      expect(state.securityMetrics).toHaveProperty('loginAttempts');
      expect(state.securityMetrics).toHaveProperty('lastFailedAttempt');
      expect(state.securityMetrics).toHaveProperty('securityChecks');
      expect(state.securityMetrics).toHaveProperty('tokenRotations');
    });
  });

  describe('Authentication Security', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      provider: AuthProvider.LOCAL
    };

    const mockTokens = {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
      accessTokenExpires: Date.now() + 3600000,
      refreshTokenExpires: Date.now() + 86400000
    };

    it('should handle successful authentication securely', async () => {
      (authService.validateSecurityContext as jest.Mock).mockResolvedValue(true);
      (authService.login as jest.Mock).mockResolvedValue(mockTokens);

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(true);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.securityMetrics.loginAttempts).toBe(0);
      expect(state.lastAuthenticated).toBeTruthy();
      expect(state.tokenRotationStatus.nextRotation).toBeTruthy();
    });

    it('should handle failed authentication securely', async () => {
      const error = {
        message: 'Invalid credentials',
        code: ApiErrorCode.UNAUTHORIZED,
        status: 401
      };

      (authService.validateSecurityContext as jest.Mock).mockRejectedValue(error);

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.securityMetrics.lastFailedAttempt).toBeTruthy();
      expect(state.securityMetrics.securityChecks).toHaveLength(1);
    });

    it('should track login attempts for rate limiting', async () => {
      (authService.validateSecurityContext as jest.Mock).mockRejectedValue({});

      await store.dispatch(login(mockCredentials));
      await store.dispatch(login(mockCredentials));
      
      const state = store.getState().auth;
      expect(state.securityMetrics.loginAttempts).toBe(2);
    });
  });

  describe('Token Rotation Security', () => {
    const mockTokens = {
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
      accessTokenExpires: Date.now() + 3600000,
      refreshTokenExpires: Date.now() + 86400000
    };

    it('should handle token rotation securely', async () => {
      (authService.validateSecurityContext as jest.Mock).mockResolvedValue(true);
      (authService.rotateToken as jest.Mock).mockResolvedValue(mockTokens);

      await store.dispatch(rotateToken());
      const state = store.getState().auth;

      expect(state.tokens).toEqual(mockTokens);
      expect(state.tokenRotationStatus.rotationInProgress).toBe(false);
      expect(state.tokenRotationStatus.lastRotation).toBeTruthy();
      expect(state.securityMetrics.tokenRotations).toBe(1);
    });

    it('should handle failed token rotation securely', async () => {
      const error = {
        message: 'Token rotation failed',
        code: ApiErrorCode.UNAUTHORIZED,
        status: 401
      };

      (authService.validateSecurityContext as jest.Mock).mockRejectedValue(error);

      await store.dispatch(rotateToken());
      const state = store.getState().auth;

      expect(state.tokenRotationStatus.rotationInProgress).toBe(false);
      expect(state.securityMetrics.securityChecks).toHaveLength(1);
      expect(state.securityMetrics.securityChecks[0].type).toBe('TOKEN_ROTATION_FAILED');
    });
  });

  describe('Logout Security', () => {
    it('should clear sensitive data securely on logout', () => {
      store.dispatch(logout());
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.securityMetrics.loginAttempts).toBe(0);
      expect(state.securityMetrics.lastFailedAttempt).toBeNull();
    });
  });

  describe('Security Metrics Management', () => {
    it('should update security metrics correctly', () => {
      const newMetrics = {
        loginAttempts: 1,
        lastFailedAttempt: new Date().toISOString(),
        securityChecks: [{ type: 'TEST', timestamp: new Date().toISOString() }],
        tokenRotations: 1
      };

      store.dispatch(setSecurityMetrics(newMetrics));
      const state = store.getState().auth;

      expect(state.securityMetrics).toEqual(newMetrics);
    });

    it('should update token rotation status correctly', () => {
      const newStatus = {
        lastRotation: new Date().toISOString(),
        nextRotation: new Date(Date.now() + 1800000).toISOString(),
        rotationInProgress: true
      };

      store.dispatch(updateTokenRotation(newStatus));
      const state = store.getState().auth;

      expect(state.tokenRotationStatus).toEqual(newStatus);
    });
  });

  describe('Selectors Security', () => {
    it('should select auth state securely', () => {
      const state = store.getState();
      const authState = selectAuth(state);

      expect(authState).toBeDefined();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.tokens).toBeNull();
    });

    it('should select auth state with security metrics', () => {
      const state = store.getState();
      const authStateWithSecurity = selectAuthWithSecurity(state);

      expect(authStateWithSecurity.securityMetrics).toBeDefined();
      expect(authStateWithSecurity.tokenRotationStatus).toBeDefined();
    });
  });
});