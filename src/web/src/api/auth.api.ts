/**
 * Authentication API Client
 * @description Enhanced API client module for secure authentication and authorization with 
 * comprehensive error handling, rate limiting, and advanced security features
 * @version 1.0.0
 */

import { TokenManager } from '@auth/token-manager'; // v2.0.0
import { AuthCredentials, AuthTokens, TokenRotation } from '../types/auth.types';
import { apiClient } from '../config/api.config';
import { API_ENDPOINTS, API_RATE_LIMITS } from '../constants/api.constants';
import { ApiError, ApiErrorCode } from '../types/api.types';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const rateLimitStore: { [key: string]: number[] } = {};

/**
 * Enhanced Authentication API class with security features
 */
export class AuthAPI {
  private tokenManager: TokenManager;
  private refreshQueue: Promise<AuthTokens> | null = null;

  constructor() {
    this.tokenManager = new TokenManager({
      accessTokenTTL: 15 * 60, // 15 minutes
      refreshTokenTTL: 7 * 24 * 60 * 60, // 7 days
      rotationEnabled: true,
      securityLevel: 'high'
    });
  }

  /**
   * Check and enforce rate limits for authentication endpoints
   * @param endpoint - API endpoint to check
   * @throws {ApiError} When rate limit is exceeded
   */
  private checkRateLimit(endpoint: string): void {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Initialize or clean up old requests
    rateLimitStore[endpoint] = (rateLimitStore[endpoint] || [])
      .filter(timestamp => timestamp > windowStart);

    // Check rate limit
    if (rateLimitStore[endpoint].length >= API_RATE_LIMITS.AUTH) {
      throw {
        message: 'Rate limit exceeded for authentication requests',
        code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        status: 429,
        details: {
          limit: API_RATE_LIMITS.AUTH,
          windowMs: RATE_LIMIT_WINDOW,
          remaining: 0
        },
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;
    }

    // Add current request timestamp
    rateLimitStore[endpoint].push(now);
  }

  /**
   * Authenticate user and obtain secure tokens
   * @param credentials - User authentication credentials
   * @returns Promise resolving to authentication tokens
   * @throws {ApiError} When authentication fails
   */
  public async login(credentials: AuthCredentials): Promise<AuthTokens> {
    try {
      // Check rate limit before proceeding
      this.checkRateLimit(API_ENDPOINTS.AUTH);

      // Validate credentials format
      if (!credentials.email || !credentials.password) {
        throw {
          message: 'Invalid credentials format',
          code: ApiErrorCode.VALIDATION_ERROR,
          status: 400,
          details: { requiredFields: ['email', 'password'] },
          timestamp: new Date().toISOString(),
          traceId: crypto.randomUUID()
        } as ApiError;
      }

      // Add security headers
      const securityHeaders = {
        'X-Request-ID': crypto.randomUUID(),
        'X-Client-Timestamp': new Date().toISOString()
      };

      // Make authentication request
      const response = await apiClient.post<AuthTokens>(
        `${API_ENDPOINTS.AUTH}/login`,
        credentials,
        { headers: securityHeaders }
      );

      // Initialize token rotation
      const tokens = response.data.data;
      await this.tokenManager.initialize(tokens);

      return tokens;
    } catch (error: any) {
      // Enhanced error handling with security context
      throw {
        message: error.response?.data?.message || 'Authentication failed',
        code: error.response?.data?.code || ApiErrorCode.UNAUTHORIZED,
        status: error.response?.status || 500,
        details: {
          originalError: error.message,
          endpoint: API_ENDPOINTS.AUTH,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        traceId: error.config?.headers?.['X-Request-ID'] || crypto.randomUUID()
      } as ApiError;
    }
  }

  /**
   * Refresh authentication tokens with enhanced security
   * @param refreshToken - Current refresh token
   * @returns Promise resolving to new authentication tokens
   * @throws {ApiError} When token refresh fails
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Return existing refresh promise if one is in progress
      if (this.refreshQueue) {
        return this.refreshQueue;
      }

      // Create new refresh promise
      this.refreshQueue = (async () => {
        try {
          // Validate refresh token
          const isValid = await this.tokenManager.validateToken(refreshToken);
          if (!isValid) {
            throw new Error('Invalid refresh token');
          }

          // Check rate limit
          this.checkRateLimit(`${API_ENDPOINTS.AUTH}/refresh`);

          // Request new tokens
          const response = await apiClient.post<AuthTokens>(
            `${API_ENDPOINTS.AUTH}/refresh`,
            { refreshToken },
            {
              headers: {
                'X-Request-ID': crypto.randomUUID(),
                'X-Client-Timestamp': new Date().toISOString()
              }
            }
          );

          const newTokens = response.data.data;

          // Update token rotation metadata
          await this.tokenManager.rotateTokens(newTokens);

          return newTokens;
        } finally {
          this.refreshQueue = null;
        }
      })();

      return this.refreshQueue;
    } catch (error: any) {
      // Enhanced error handling for token refresh
      throw {
        message: error.response?.data?.message || 'Token refresh failed',
        code: error.response?.data?.code || ApiErrorCode.UNAUTHORIZED,
        status: error.response?.status || 500,
        details: {
          originalError: error.message,
          endpoint: `${API_ENDPOINTS.AUTH}/refresh`,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        traceId: error.config?.headers?.['X-Request-ID'] || crypto.randomUUID()
      } as ApiError;
    }
  }
}

// Export singleton instance
export const authApi = new AuthAPI();