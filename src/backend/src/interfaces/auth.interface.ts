/**
 * @fileoverview Authentication service interfaces for secure JWT-based authentication
 * @version 1.0.0
 * @module interfaces/auth
 * 
 * This module defines the core interfaces for authentication, token management,
 * and session handling with enhanced security features including MFA support,
 * device fingerprinting, and SSO integration as specified in the technical requirements.
 */

import {
  AuthTokenType,
  TokenPayload,
  AuthTokens,
  AuthCredentials,
  AuthSession,
  SecurityContext,
  DeviceInfo
} from '../types/auth.types';

/**
 * Enhanced authentication service interface with MFA and security context support
 * Implements secure authentication flows with comprehensive security features
 */
export interface IAuthService {
  /**
   * Authenticates user credentials and returns JWT tokens
   * @param credentials - User authentication credentials
   * @param securityContext - Security context for the authentication request
   * @returns Promise resolving to authentication tokens
   * @throws AuthError on invalid credentials or account lockout
   */
  login(
    credentials: AuthCredentials,
    securityContext: SecurityContext
  ): Promise<AuthTokens>;

  /**
   * Registers a new user account with provided credentials
   * @param credentials - New user registration credentials
   * @param securityContext - Security context for the registration request
   * @throws AuthError on validation failure or existing account
   */
  register(
    credentials: AuthCredentials,
    securityContext: SecurityContext
  ): Promise<void>;

  /**
   * Refreshes an expired access token using a valid refresh token
   * @param refreshToken - Valid refresh token
   * @param securityContext - Security context for the refresh request
   * @returns Promise resolving to new token pair
   * @throws AuthError on invalid or expired refresh token
   */
  refreshToken(
    refreshToken: string,
    securityContext: SecurityContext
  ): Promise<AuthTokens>;

  /**
   * Logs out user and invalidates all active sessions
   * @param userId - User identifier
   * @param securityContext - Security context for the logout request
   * @throws AuthError on session invalidation failure
   */
  logout(
    userId: string,
    securityContext: SecurityContext
  ): Promise<void>;

  /**
   * Validates and decodes a JWT token
   * @param token - JWT token to validate
   * @param securityContext - Security context for the validation request
   * @returns Promise resolving to decoded token payload
   * @throws AuthError on invalid or expired token
   */
  validateToken(
    token: string,
    securityContext: SecurityContext
  ): Promise<TokenPayload>;

  /**
   * Initiates multi-factor authentication process
   * @param userId - User identifier
   * @param method - MFA method (TOTP/SMS/EMAIL)
   * @returns Promise resolving to MFA challenge token
   * @throws AuthError on MFA initialization failure
   */
  initiateMultiFactorAuth(
    userId: string,
    method: string
  ): Promise<string>;

  /**
   * Verifies multi-factor authentication challenge
   * @param userId - User identifier
   * @param challengeToken - MFA challenge token
   * @param verificationCode - User-provided verification code
   * @returns Promise resolving to verification status
   * @throws AuthError on invalid verification code
   */
  verifyMultiFactorAuth(
    userId: string,
    challengeToken: string,
    verificationCode: string
  ): Promise<boolean>;
}

/**
 * Enhanced token management service interface with advanced security features
 * Implements JWT token lifecycle management with RSA-256 encryption
 */
export interface ITokenService {
  /**
   * Generates a new JWT token
   * @param payload - Token payload data
   * @param type - Token type (access/refresh)
   * @param securityContext - Security context for token generation
   * @returns Promise resolving to JWT token string
   * @throws AuthError on token generation failure
   */
  generateToken(
    payload: TokenPayload,
    type: AuthTokenType,
    securityContext: SecurityContext
  ): Promise<string>;

  /**
   * Verifies JWT token validity
   * @param token - JWT token to verify
   * @param type - Expected token type
   * @param securityContext - Security context for verification
   * @returns Promise resolving to token validity status
   * @throws AuthError on token verification failure
   */
  verifyToken(
    token: string,
    type: AuthTokenType,
    securityContext: SecurityContext
  ): Promise<boolean>;

  /**
   * Decodes JWT token payload without verification
   * @param token - JWT token to decode
   * @param securityContext - Security context for decoding
   * @returns Promise resolving to decoded token payload
   * @throws AuthError on token decoding failure
   */
  decodeToken(
    token: string,
    securityContext: SecurityContext
  ): Promise<TokenPayload>;

  /**
   * Revokes a valid JWT token
   * @param token - JWT token to revoke
   * @param securityContext - Security context for revocation
   * @throws AuthError on token revocation failure
   */
  revokeToken(
    token: string,
    securityContext: SecurityContext
  ): Promise<void>;
}

/**
 * Enhanced session management service interface with advanced security and monitoring
 * Implements secure session handling with device fingerprinting
 */
export interface ISessionService {
  /**
   * Creates a new authentication session
   * @param userId - User identifier
   * @param refreshToken - Associated refresh token
   * @param deviceInfo - Client device information
   * @param securityContext - Security context for session creation
   * @returns Promise resolving to created session
   * @throws AuthError on session creation failure
   */
  createSession(
    userId: string,
    refreshToken: string,
    deviceInfo: DeviceInfo,
    securityContext: SecurityContext
  ): Promise<AuthSession>;

  /**
   * Validates an existing session
   * @param sessionId - Session identifier
   * @param securityContext - Security context for validation
   * @returns Promise resolving to session if valid
   * @throws AuthError on invalid or expired session
   */
  validateSession(
    sessionId: string,
    securityContext: SecurityContext
  ): Promise<AuthSession>;

  /**
   * Revokes an active session
   * @param sessionId - Session identifier
   * @param securityContext - Security context for revocation
   * @throws AuthError on session revocation failure
   */
  revokeSession(
    sessionId: string,
    securityContext: SecurityContext
  ): Promise<void>;

  /**
   * Lists all active sessions for a user
   * @param userId - User identifier
   * @param securityContext - Security context for query
   * @returns Promise resolving to array of active sessions
   * @throws AuthError on query failure
   */
  listActiveSessions(
    userId: string,
    securityContext: SecurityContext
  ): Promise<AuthSession[]>;

  /**
   * Validates device fingerprint against session
   * @param sessionId - Session identifier
   * @param deviceInfo - Current device information
   * @param securityContext - Security context for validation
   * @returns Promise resolving to validation status
   * @throws AuthError on validation failure
   */
  validateDeviceFingerprint(
    sessionId: string,
    deviceInfo: DeviceInfo,
    securityContext: SecurityContext
  ): Promise<boolean>;
}