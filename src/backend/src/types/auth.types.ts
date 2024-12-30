/**
 * @fileoverview TypeScript type definitions for authentication and authorization
 * @version 1.0.0
 * @module types/auth
 * 
 * This module defines the core type definitions for the authentication and
 * authorization system, implementing JWT-based authentication with SSO provider
 * integration as specified in the technical requirements.
 */

// External imports
import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

// Internal imports
import { UserRole, User } from './user.types';

/**
 * Enum defining types of authentication tokens
 * Used for differentiating between access and refresh tokens
 * in the JWT-based authentication system
 */
export enum AuthTokenType {
  ACCESS = 'ACCESS',   // Short-lived token for API access
  REFRESH = 'REFRESH'  // Long-lived token for refreshing access tokens
}

/**
 * Enum defining supported authentication providers
 * Supports both local authentication and SSO integration
 * as per security specifications
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',  // Local email/password authentication
  SSO = 'SSO'      // Single Sign-On provider authentication
}

/**
 * Interface defining the structure of JWT token payload
 * Extends the standard JWT payload with application-specific claims
 */
export interface TokenPayload extends JwtPayload {
  userId: string;           // Unique user identifier
  email: string;           // User email address
  role: UserRole;          // User role for authorization
  type: AuthTokenType;     // Token type (access/refresh)
}

/**
 * Interface defining authentication credentials structure
 * Used for initial authentication requests
 */
export interface AuthCredentials {
  email: string;                    // User email address
  password: string;                 // User password (for local auth)
  provider: AuthProvider;           // Authentication provider
}

/**
 * Interface defining authentication token response
 * Returned after successful authentication
 */
export interface AuthTokens {
  accessToken: string;              // JWT access token
  refreshToken: string;             // JWT refresh token
  expiresIn: number;               // Access token expiration time in seconds
}

/**
 * Interface defining user authentication session
 * Used for managing active user sessions
 */
export interface AuthSession {
  id: string;                      // Unique session identifier
  userId: string;                  // Associated user identifier
  refreshToken: string;            // Active refresh token
  expiresAt: Date;                // Session expiration timestamp
  createdAt: Date;                // Session creation timestamp
}

/**
 * Interface for MFA (Multi-Factor Authentication) configuration
 * Supports various second-factor authentication methods
 */
export interface MFAConfig {
  enabled: boolean;                // MFA status flag
  method: 'TOTP' | 'SMS' | 'EMAIL'; // MFA method
  secret?: string;                 // TOTP secret (if applicable)
  phone?: string;                  // Phone number (if SMS)
  verified: boolean;               // MFA verification status
}

/**
 * Interface for authentication attempt tracking
 * Used for security monitoring and rate limiting
 */
export interface AuthAttempt {
  id: string;                      // Attempt identifier
  userId: string;                  // Target user identifier
  ip: string;                      // Source IP address
  userAgent: string;               // Browser/client identifier
  successful: boolean;             // Attempt outcome
  timestamp: Date;                 // Attempt timestamp
}

/**
 * Type defining possible authentication errors
 * Used for standardized error handling
 */
export type AuthError =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'MFA_REQUIRED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'SESSION_EXPIRED'
  | 'INSUFFICIENT_PERMISSIONS';

/**
 * Interface for SSO provider configuration
 * Supports enterprise SSO integration
 */
export interface SSOConfig {
  provider: string;                // SSO provider identifier
  clientId: string;               // OAuth client ID
  clientSecret: string;           // OAuth client secret
  callbackUrl: string;            // OAuth callback URL
  scopes: string[];              // Required OAuth scopes
}