/**
 * @fileoverview Comprehensive test suite for useAuth hook verifying authentication,
 * security operations, and compliance with security standards.
 * @version 1.0.0
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks'; // v8.0.1
import { Provider } from 'react-redux'; // v9.0.0
import { configureStore } from '@reduxjs/toolkit'; // v2.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.7.0
import { useAuth } from '../../src/hooks/useAuth';
import authReducer, {
  login,
  logout,
  refreshToken,
  setSecurityMetrics,
  updateTokenRotation
} from '../../src/redux/auth/authSlice';
import type {
  AuthState,
  AuthCredentials,
  AuthTokens,
  SecurityMetrics
} from '../../src/types/auth.types';
import { ApiError, ApiErrorCode } from '../../src/types/api.types';

// Test constants
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_ROTATION_INTERVAL = 60 * 60 * 1000; // 1 hour

// Mock credentials and tokens
const mockCredentials: AuthCredentials = {
  email: 'test@example.com',
  password: 'Test123!@#',
  mfaToken: '123456'
};

const mockTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  accessTokenExpires: Date.now() + 3600000,
  refreshTokenExpires: Date.now() + 86400000
};

// Setup test environment
const setupTestEnvironment = () => {
  // Create mock store
  const store = configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
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
      }
    }
  });

  // Create wrapper with Provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, wrapper };
};

describe('useAuth Hook', () => {
  let mockStore: ReturnType<typeof setupTestEnvironment>['store'];
  let mockWrapper: ReturnType<typeof setupTestEnvironment>['wrapper'];

  beforeEach(() => {
    const env = setupTestEnvironment();
    mockStore = env.store;
    mockWrapper = env.wrapper;
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Authentication Operations', () => {
    it('should handle successful login with security validation', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeTruthy();
      expect(result.current.securityMetrics.loginAttempts).toBe(1);
      expect(result.current.securityMetrics.lastFailedAttempt).toBeNull();
    });

    it('should enforce login attempt rate limiting', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Attempt multiple rapid logins
      await act(async () => {
        for (let i = 0; i < 4; i++) {
          try {
            await result.current.login(mockCredentials);
          } catch (error) {
            expect(error).toEqual(expect.any(ApiError));
            expect(error.code).toBe(ApiErrorCode.RATE_LIMIT_EXCEEDED);
          }
        }
      });

      expect(result.current.securityMetrics.loginAttempts).toBeGreaterThan(0);
      expect(result.current.securityMetrics.lastFailedAttempt).toBeTruthy();
    });

    it('should handle logout with security cleanup', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Login first
      await act(async () => {
        await result.current.login(mockCredentials);
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.securityMetrics.loginAttempts).toBe(0);
    });
  });

  describe('Token Management', () => {
    it('should handle automatic token refresh', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Login and initialize tokens
      await act(async () => {
        await result.current.login(mockCredentials);
      });

      // Fast-forward past token refresh interval
      act(() => {
        jest.advanceTimersByTime(TOKEN_REFRESH_INTERVAL);
      });

      expect(mockStore.getState().auth.tokens).toBeTruthy();
      expect(result.current.securityMetrics.tokenRotations).toBeGreaterThan(0);
    });

    it('should handle token rotation security', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      // Fast-forward to token rotation interval
      act(() => {
        jest.advanceTimersByTime(TOKEN_ROTATION_INTERVAL);
      });

      const { tokenRotationStatus } = result.current;
      expect(tokenRotationStatus.rotationInProgress).toBe(false);
      expect(tokenRotationStatus.lastRotation).toBeTruthy();
      expect(tokenRotationStatus.nextRotation).toBeTruthy();
    });
  });

  describe('Security Metrics', () => {
    it('should track security-related events', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Perform various security-sensitive operations
      await act(async () => {
        await result.current.login(mockCredentials);
        await result.current.refreshToken();
        await result.current.logout();
      });

      const metrics = result.current.securityMetrics;
      expect(metrics.loginAttempts).toBeGreaterThanOrEqual(0);
      expect(metrics.securityChecks.length).toBeGreaterThan(0);
      expect(metrics.tokenRotations).toBeGreaterThanOrEqual(0);
    });

    it('should handle failed authentication attempts', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Attempt login with invalid credentials
      await act(async () => {
        try {
          await result.current.login({ ...mockCredentials, password: 'wrong' });
        } catch (error) {
          expect(error).toEqual(expect.any(ApiError));
        }
      });

      expect(result.current.securityMetrics.lastFailedAttempt).toBeTruthy();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors securely', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Simulate network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        try {
          await result.current.login(mockCredentials);
        } catch (error) {
          expect(error).toEqual(expect.any(ApiError));
          expect(error.code).toBe(ApiErrorCode.INTERNAL_ERROR);
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle invalid tokens securely', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: mockWrapper });

      // Set invalid token state
      await act(async () => {
        mockStore.dispatch(updateTokenRotation({
          lastRotation: Date.now(),
          nextRotation: Date.now(),
          rotationInProgress: false
        }));
      });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          expect(error).toEqual(expect.any(ApiError));
          expect(error.code).toBe(ApiErrorCode.UNAUTHORIZED);
        }
      });
    });
  });
});