/**
 * @fileoverview Enhanced Authentication Service implementing secure authentication,
 * authorization, and session management with comprehensive security features.
 * @version 1.0.0
 */

import jwtDecode from 'jwt-decode'; // v4.0.0
import { SecurityLogger } from '@security/logger'; // v2.0.0
import { RateLimiter } from '@security/rate-limit'; // v1.5.0
import {
  AuthCredentials,
  AuthTokens,
  TokenPayload,
  AuthProvider,
  AuthState
} from '../types/auth.types';
import {
  login,
  register,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword
} from '../api/auth.api';
import { StorageService } from './storage.service';
import { ApiError, ApiErrorCode } from '../types/api.types';
import { API_RATE_LIMITS } from '../constants/api.constants';

/**
 * Queue for managing concurrent token refresh requests
 */
interface RefreshQueueItem {
  resolve: (value: AuthTokens) => void;
  reject: (error: Error) => void;
}

/**
 * Enhanced Authentication Service with comprehensive security features
 */
export class AuthService {
  private storageService: StorageService;
  private authState: AuthState;
  private rateLimiter: RateLimiter;
  private securityLogger: SecurityLogger;
  private refreshQueue: RefreshQueueItem[] = [];
  private isRefreshing = false;
  private tokenCheckInterval: NodeJS.Timeout | null = null;

  private static instance: AuthService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.storageService = new StorageService('localStorage');
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: API_RATE_LIMITS.AUTH
    });
    this.securityLogger = new SecurityLogger({
      service: 'AuthService',
      logLevel: 'info'
    });
    this.authState = {
      isAuthenticated: false,
      user: null,
      tokens: null,
      loading: false,
      error: null,
      lastAuthenticated: 0
    };
    this.initializeTokenCheck();
  }

  /**
   * Get singleton instance of AuthService
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate user with enhanced security checks
   * @param credentials - User authentication credentials
   * @returns Promise resolving to authentication tokens
   * @throws {ApiError} When authentication fails or rate limit exceeded
   */
  public async login(credentials: AuthCredentials): Promise<AuthTokens> {
    try {
      // Check rate limit
      if (!this.rateLimiter.checkLimit()) {
        throw {
          message: 'Too many login attempts. Please try again later.',
          code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
          status: 429
        } as ApiError;
      }

      this.authState.loading = true;
      this.authState.error = null;

      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw {
          message: 'Invalid credentials format',
          code: ApiErrorCode.VALIDATION_ERROR,
          status: 400
        } as ApiError;
      }

      // Perform authentication
      const response = await login(credentials);
      const tokens = response.data;

      // Validate tokens
      this.validateTokens(tokens);

      // Store tokens securely
      await this.storageService.setAuthToken(tokens.accessToken);
      await this.storageService.setItem('refreshToken', tokens.refreshToken, true);

      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: this.extractUserFromToken(tokens.accessToken),
        tokens,
        loading: false,
        error: null,
        lastAuthenticated: Date.now()
      };

      // Log successful authentication
      this.securityLogger.info('User authenticated successfully', {
        userId: this.authState.user?.id,
        provider: credentials.provider || AuthProvider.LOCAL
      });

      return tokens;
    } catch (error: any) {
      const apiError = {
        message: error.message || 'Authentication failed',
        code: error.code || ApiErrorCode.UNAUTHORIZED,
        status: error.status || 401,
        details: error.details || {},
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;

      this.authState.error = apiError;
      this.authState.loading = false;
      this.authState.isAuthenticated = false;

      this.securityLogger.error('Authentication failed', {
        error: apiError,
        email: credentials.email
      });

      throw apiError;
    }
  }

  /**
   * Refresh authentication tokens with queuing mechanism
   * @returns Promise resolving to new authentication tokens
   * @throws {ApiError} When token refresh fails
   */
  public async refreshAuthTokens(): Promise<AuthTokens> {
    try {
      const currentRefreshToken = await this.storageService.getItem<string>('refreshToken', true);

      if (!currentRefreshToken) {
        throw {
          message: 'No refresh token available',
          code: ApiErrorCode.UNAUTHORIZED,
          status: 401
        } as ApiError;
      }

      // Add to queue if refresh is in progress
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.refreshQueue.push({ resolve, reject });
        });
      }

      this.isRefreshing = true;

      const tokens = await refreshToken(currentRefreshToken);
      
      // Update stored tokens
      await this.storageService.setAuthToken(tokens.accessToken);
      await this.storageService.setItem('refreshToken', tokens.refreshToken, true);

      // Process queue
      this.refreshQueue.forEach(request => {
        request.resolve(tokens);
      });
      this.refreshQueue = [];

      return tokens;
    } catch (error: any) {
      this.refreshQueue.forEach(request => {
        request.reject(error);
      });
      this.refreshQueue = [];

      await this.logout();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Logout user and clear secure storage
   */
  public async logout(): Promise<void> {
    try {
      await logout();
      await this.storageService.clearStorage();
      
      if (this.tokenCheckInterval) {
        clearInterval(this.tokenCheckInterval);
        this.tokenCheckInterval = null;
      }

      this.authState = {
        isAuthenticated: false,
        user: null,
        tokens: null,
        loading: false,
        error: null,
        lastAuthenticated: 0
      };

      this.securityLogger.info('User logged out successfully', {
        userId: this.authState.user?.id
      });
    } catch (error) {
      this.securityLogger.error('Logout failed', { error });
      throw error;
    }
  }

  /**
   * Get current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Initialize token check interval
   * @private
   */
  private initializeTokenCheck(): void {
    // Check token validity every minute
    this.tokenCheckInterval = setInterval(async () => {
      if (this.authState.isAuthenticated && this.authState.tokens) {
        const tokenPayload = this.decodeToken(this.authState.tokens.accessToken);
        
        if (tokenPayload && this.isTokenExpiringSoon(tokenPayload)) {
          try {
            const newTokens = await this.refreshAuthTokens();
            this.authState.tokens = newTokens;
          } catch (error) {
            await this.logout();
          }
        }
      }
    }, 60000);
  }

  /**
   * Validate authentication tokens
   * @private
   */
  private validateTokens(tokens: AuthTokens): void {
    if (!tokens.accessToken || !tokens.refreshToken) {
      throw {
        message: 'Invalid token format',
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400
      } as ApiError;
    }

    const accessPayload = this.decodeToken(tokens.accessToken);
    const refreshPayload = this.decodeToken(tokens.refreshToken);

    if (!accessPayload || !refreshPayload) {
      throw {
        message: 'Invalid token payload',
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400
      } as ApiError;
    }
  }

  /**
   * Decode JWT token
   * @private
   */
  private decodeToken(token: string): TokenPayload | null {
    try {
      return jwtDecode<TokenPayload>(token);
    } catch {
      return null;
    }
  }

  /**
   * Extract user information from token
   * @private
   */
  private extractUserFromToken(token: string): any {
    const payload = this.decodeToken(token);
    if (!payload) return null;

    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
  }

  /**
   * Check if token is expiring soon (within 5 minutes)
   * @private
   */
  private isTokenExpiringSoon(payload: TokenPayload): boolean {
    const expirationBuffer = 5 * 60; // 5 minutes
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp - currentTime <= expirationBuffer;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();