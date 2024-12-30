/**
 * @fileoverview Authentication configuration module for the Task Management System
 * Implements secure JWT token settings, SSO provider configuration, and authentication parameters
 * @version 1.0.0
 */

import { AuthConfig } from '../interfaces/config.interface';
import * as dotenv from 'dotenv'; // v16.0.0
import { createHash, randomBytes } from 'crypto';

// Load environment variables
dotenv.config();

/**
 * Constants for authentication configuration
 */
const DEFAULT_JWT_EXPIRES_IN = '1h';
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';
const DEFAULT_SSO_PROVIDER = 'Auth0';
const MIN_JWT_SECRET_LENGTH = 32;
const TOKEN_EXPIRATION_REGEX = /^\d+[smhd]$/;

/**
 * Validates token expiration time format and values
 * @param expirationTime - Token expiration time in format: number + unit (s,m,h,d)
 * @returns boolean indicating if expiration time is valid
 * @throws Error if expiration time format is invalid
 */
const validateTokenExpiration = (expirationTime: string): boolean => {
  if (!TOKEN_EXPIRATION_REGEX.test(expirationTime)) {
    throw new Error('Invalid token expiration format. Use format: number + unit (s,m,h,d)');
  }

  const value = parseInt(expirationTime.slice(0, -1));
  const unit = expirationTime.slice(-1);

  // Validate expiration time ranges based on unit
  switch (unit) {
    case 's':
      return value >= 300 && value <= 3600; // 5 minutes to 1 hour
    case 'm':
      return value >= 5 && value <= 60; // 5 to 60 minutes
    case 'h':
      return value >= 1 && value <= 24; // 1 to 24 hours
    case 'd':
      return value >= 1 && value <= 30; // 1 to 30 days
    default:
      return false;
  }
};

/**
 * Validates JWT secret strength using crypto
 * @param secret - JWT secret to validate
 * @returns boolean indicating if secret meets security requirements
 */
const validateJwtSecretStrength = (secret: string): boolean => {
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    return false;
  }

  // Calculate entropy using SHA-256
  const entropy = createHash('sha256').update(secret).digest('hex');
  const entropyBits = entropy.length * 4; // Each hex character represents 4 bits

  return entropyBits >= 256; // Minimum 256 bits of entropy required
};

/**
 * Validates the complete authentication configuration
 * @throws Error if configuration is invalid or insecure
 */
const validateAuthConfig = (): void => {
  // Validate JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || !validateJwtSecretStrength(jwtSecret)) {
    throw new Error('Invalid or insecure JWT secret. Minimum length: 32 characters with high entropy');
  }

  // Validate token expirations
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
  const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_EXPIRES_IN;

  if (!validateTokenExpiration(jwtExpiresIn)) {
    throw new Error('Invalid JWT expiration time');
  }
  if (!validateTokenExpiration(refreshTokenExpiresIn)) {
    throw new Error('Invalid refresh token expiration time');
  }

  // Validate SSO configuration
  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SSO client credentials are required');
  }

  // Validate environment-specific configurations
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.TOKEN_BLACKLIST_ENABLED) {
      throw new Error('Token blacklist must be enabled in production');
    }
  }
};

// Validate configuration on module load
validateAuthConfig();

/**
 * Authentication configuration object
 * Contains validated and secure authentication settings
 */
export const authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
  ssoProvider: process.env.SSO_PROVIDER || DEFAULT_SSO_PROVIDER,
  clientId: process.env.SSO_CLIENT_ID!,
  clientSecret: process.env.SSO_CLIENT_SECRET!,
  mfaEnabled: process.env.MFA_ENABLED === 'true',
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '30', 10),
  tokenBlacklistEnabled: process.env.TOKEN_BLACKLIST_ENABLED === 'true'
};

// Export individual configuration values for convenience
export const {
  jwtSecret,
  jwtExpiresIn,
  refreshTokenExpiresIn,
  ssoProvider,
  clientId,
  clientSecret,
  mfaEnabled,
  sessionTimeout,
  tokenBlacklistEnabled
} = authConfig;

/**
 * Generate a cryptographically secure random JWT secret
 * Utility function for initial setup and secret rotation
 * @returns string A secure random JWT secret
 */
export const generateSecureJwtSecret = (): string => {
  return randomBytes(48).toString('hex');
};