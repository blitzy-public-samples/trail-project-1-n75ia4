/**
 * @fileoverview TypeScript type definitions for authentication and authorization related
 * data structures used in the frontend application. Implements JWT-based authentication
 * with SSO provider integration and secure session management.
 * @version 1.0.0
 */

import { User, UserRole } from './user.types';
import { ApiError } from './api.types';
import { JwtPayload } from 'jwt-decode'; // v4.0.0

/**
 * Enumeration of authentication token types.
 * Implements secure token management for access and refresh tokens.
 */
export enum AuthTokenType {
  /** Short-lived access token */
  ACCESS = 'ACCESS',
  /** Long-lived refresh token */
  REFRESH = 'REFRESH'
}

/**
 * Enumeration of supported authentication providers.
 * Supports both local authentication and SSO integration.
 */
export enum AuthProvider {
  /** Local email/password authentication */
  LOCAL = 'LOCAL',
  /** Single Sign-On provider */
  SSO = 'SSO'
}

/**
 * Interface defining the structure of authentication tokens.
 * Implements secure token storage with expiration tracking.
 */
export interface AuthTokens {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** Access token expiration timestamp */
  accessTokenExpires: number;
  /** Refresh token expiration timestamp */
  refreshTokenExpires: number;
}

/**
 * Interface extending JwtPayload with enhanced security fields.
 * Implements comprehensive token payload structure with role-based access control.
 */
export interface TokenPayload extends JwtPayload {
  /** Unique user identifier */
  userId: string;
  /** User email address */
  email: string;
  /** User role for access control */
  role: UserRole;
  /** Token type */
  type: AuthTokenType;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
  /** Token issuer */
  iss: string;
}

/**
 * Interface for authentication requests.
 * Defines required fields for authentication attempts.
 */
export interface AuthRequest {
  /** User email */
  email: string;
  /** User password (for local auth) */
  password?: string;
  /** Authentication provider */
  provider: AuthProvider;
  /** SSO token (for SSO auth) */
  ssoToken?: string;
}

/**
 * Interface for authentication responses.
 * Provides authentication result with tokens and user data.
 */
export interface AuthResponse {
  /** Authentication tokens */
  tokens: AuthTokens;
  /** Authenticated user data */
  user: User;
  /** Authentication provider used */
  provider: AuthProvider;
}

/**
 * Interface defining the authentication state.
 * Implements comprehensive auth state management with error handling.
 */
export interface AuthState {
  /** Authentication status */
  isAuthenticated: boolean;
  /** Authenticated user data */
  user: User | null;
  /** Authentication tokens */
  tokens: AuthTokens | null;
  /** Loading state indicator */
  loading: boolean;
  /** Authentication error */
  error: ApiError | null;
  /** Last successful authentication timestamp */
  lastAuthenticated: number;
}

/**
 * Interface for token refresh requests.
 * Implements secure token refresh mechanism.
 */
export interface RefreshTokenRequest {
  /** Refresh token */
  refreshToken: string;
}

/**
 * Interface for token validation response.
 * Provides token validation result with expiration status.
 */
export interface TokenValidationResponse {
  /** Token validity status */
  valid: boolean;
  /** Token expiration status */
  expired: boolean;
  /** Validation error message */
  error?: string;
  /** Token payload if valid */
  payload?: TokenPayload;
}

/**
 * Type guard to check if a value is a valid AuthTokenType.
 * @param value - Value to check
 */
export function isAuthTokenType(value: any): value is AuthTokenType {
  return Object.values(AuthTokenType).includes(value);
}

/**
 * Type guard to check if a value is a valid AuthProvider.
 * @param value - Value to check
 */
export function isAuthProvider(value: any): value is AuthProvider {
  return Object.values(AuthProvider).includes(value);
}