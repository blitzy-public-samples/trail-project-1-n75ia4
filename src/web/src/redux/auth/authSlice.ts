/**
 * @fileoverview Enhanced Redux slice for authentication state management with
 * comprehensive security features, token rotation, and monitoring capabilities.
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v2.0.0
import {
  AuthState,
  AuthCredentials,
  AuthTokens,
  TokenPayload,
  SecurityMetrics,
  TokenRotationStatus
} from '../../types/auth.types';
import { authService } from '../../services/auth.service';
import { ApiError } from '../../types/api.types';

/**
 * Initial authentication state with enhanced security metrics
 */
const initialState: AuthState & {
  securityMetrics: SecurityMetrics;
  tokenRotationStatus: TokenRotationStatus;
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

/**
 * Enhanced async thunk for user authentication with security validation
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      // Validate security context and device fingerprint
      await authService.validateSecurityContext();

      // Perform authentication
      const tokens = await authService.login(credentials);

      // Schedule initial token rotation
      const rotationTime = new Date();
      rotationTime.setMinutes(rotationTime.getMinutes() + 30); // 30 minutes rotation

      return {
        tokens,
        rotationTime: rotationTime.toISOString()
      };
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for secure token rotation
 */
export const rotateToken = createAsyncThunk(
  'auth/rotateToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Validate security context before rotation
      await authService.validateSecurityContext();

      // Perform token rotation
      const tokens = await authService.rotateToken();

      // Schedule next rotation
      const rotationTime = new Date();
      rotationTime.setMinutes(rotationTime.getMinutes() + 30);

      return {
        tokens,
        rotationTime: rotationTime.toISOString()
      };
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Enhanced authentication slice with security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Update security metrics
     */
    setSecurityMetrics: (state, action: PayloadAction<Partial<SecurityMetrics>>) => {
      state.securityMetrics = {
        ...state.securityMetrics,
        ...action.payload
      };
    },
    /**
     * Update token rotation status
     */
    updateTokenRotation: (state, action: PayloadAction<Partial<TokenRotationStatus>>) => {
      state.tokenRotationStatus = {
        ...state.tokenRotationStatus,
        ...action.payload
      };
    },
    /**
     * Clear authentication state securely
     */
    logout: (state) => {
      // Securely clear sensitive data
      Object.assign(state, {
        ...initialState,
        securityMetrics: {
          ...state.securityMetrics,
          loginAttempts: 0,
          lastFailedAttempt: null
        }
      });
    }
  },
  extraReducers: (builder) => {
    builder
      // Login action handlers
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.securityMetrics.loginAttempts++;
      })
      .addCase(login.fulfilled, (state, action) => {
        const { tokens, rotationTime } = action.payload;
        state.isAuthenticated = true;
        state.tokens = tokens;
        state.loading = false;
        state.lastAuthenticated = new Date().toISOString();
        state.error = null;
        state.tokenRotationStatus = {
          lastRotation: new Date().toISOString(),
          nextRotation: rotationTime,
          rotationInProgress: false
        };
        // Reset security metrics on successful login
        state.securityMetrics.loginAttempts = 0;
        state.securityMetrics.lastFailedAttempt = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
        state.securityMetrics.lastFailedAttempt = new Date().toISOString();
        state.securityMetrics.securityChecks.push({
          type: 'LOGIN_FAILED',
          timestamp: new Date().toISOString(),
          details: action.payload
        });
      })
      // Token rotation action handlers
      .addCase(rotateToken.pending, (state) => {
        state.tokenRotationStatus.rotationInProgress = true;
      })
      .addCase(rotateToken.fulfilled, (state, action) => {
        const { tokens, rotationTime } = action.payload;
        state.tokens = tokens;
        state.tokenRotationStatus = {
          lastRotation: new Date().toISOString(),
          nextRotation: rotationTime,
          rotationInProgress: false
        };
        state.securityMetrics.tokenRotations++;
      })
      .addCase(rotateToken.rejected, (state, action) => {
        state.tokenRotationStatus.rotationInProgress = false;
        state.securityMetrics.securityChecks.push({
          type: 'TOKEN_ROTATION_FAILED',
          timestamp: new Date().toISOString(),
          details: action.payload
        });
      });
  }
});

// Export actions
export const { setSecurityMetrics, updateTokenRotation, logout } = authSlice.actions;

// Export selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectAuthWithSecurity = (state: { auth: AuthState & { 
  securityMetrics: SecurityMetrics;
  tokenRotationStatus: TokenRotationStatus;
} }) => ({
  isAuthenticated: state.auth.isAuthenticated,
  user: state.auth.user,
  tokens: state.auth.tokens,
  securityMetrics: state.auth.securityMetrics,
  tokenRotationStatus: state.auth.tokenRotationStatus
});

// Export reducer
export default authSlice.reducer;