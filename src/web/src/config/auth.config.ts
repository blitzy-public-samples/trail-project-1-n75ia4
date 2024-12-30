/**
 * @fileoverview Authentication configuration file that defines comprehensive security settings,
 * token management parameters, and authentication provider configurations for the frontend application.
 * Implements JWT-based authentication with SSO provider integration and secure session management.
 * @version 1.0.0
 */

import { AuthTokenType, AuthProvider } from '../types/auth.types';
import { AES, enc, lib } from 'crypto-js'; // v4.2.0

/**
 * Interface defining authentication provider configuration with security options
 */
interface AuthProviderConfig {
  clientId: string;
  authorizeEndpoint: string;
  tokenEndpoint: string;
  scope: string;
  responseType: string;
  pkceEnabled: boolean;
  allowedDomains: string[];
}

/**
 * Interface defining global security configuration options
 */
interface SecurityOptions {
  useHttpOnlyCookies: boolean;
  enableCSRFProtection: boolean;
  maxAuthRetries: number;
  tokenEncryptionMethod: string;
  enforceStrongPasswords: boolean;
  sessionInactivityTimeout: number;
  tokenRefreshThreshold: number;
}

// Constants for token management and security settings
const AUTH_TOKEN_STORAGE_KEY = 'task_management_auth_tokens';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_AUTH_RETRIES = 3;
const TOKEN_ENCRYPTION_KEY = import.meta.env.VITE_TOKEN_ENCRYPTION_KEY;

/**
 * Encrypts authentication tokens before storage using AES-256-GCM
 * @param token - Token to encrypt
 * @returns Encrypted token string
 */
const encryptToken = (token: string): string => {
  if (!TOKEN_ENCRYPTION_KEY) {
    throw new Error('Token encryption key is not configured');
  }
  
  const iv = lib.WordArray.random(16);
  const encrypted = AES.encrypt(token, TOKEN_ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return `${iv.toString()}:${encrypted.toString()}`;
};

/**
 * Retrieves and validates configuration for specified authentication provider
 * @param provider - Authentication provider
 * @returns Validated provider-specific configuration
 */
const getAuthProviderConfig = (provider: AuthProvider): AuthProviderConfig => {
  const configs: Record<AuthProvider, AuthProviderConfig> = {
    [AuthProvider.SSO]: {
      clientId: import.meta.env.VITE_SSO_CLIENT_ID,
      authorizeEndpoint: import.meta.env.VITE_SSO_AUTHORIZE_ENDPOINT,
      tokenEndpoint: import.meta.env.VITE_SSO_TOKEN_ENDPOINT,
      scope: 'openid profile email',
      responseType: 'code',
      pkceEnabled: true,
      allowedDomains: import.meta.env.VITE_AUTH_ALLOWED_DOMAINS?.split(',') || []
    },
    [AuthProvider.LOCAL]: {
      clientId: 'local',
      authorizeEndpoint: '/api/v1/auth/login',
      tokenEndpoint: '/api/v1/auth/token',
      scope: 'local',
      responseType: 'token',
      pkceEnabled: false,
      allowedDomains: ['*']
    }
  };

  const config = configs[provider];
  if (!config) {
    throw new Error(`Unsupported authentication provider: ${provider}`);
  }

  return config;
};

/**
 * Comprehensive authentication configuration object with enhanced security settings
 */
export const authConfig = {
  /**
   * Storage key for authentication tokens in secure storage
   */
  tokenStorageKey: AUTH_TOKEN_STORAGE_KEY,

  /**
   * Time threshold before token expiration to trigger refresh (in milliseconds)
   */
  refreshThreshold: TOKEN_REFRESH_THRESHOLD,

  /**
   * Session timeout duration for inactivity (in milliseconds)
   */
  sessionTimeout: SESSION_TIMEOUT,

  /**
   * Authentication provider configurations
   */
  providers: {
    [AuthProvider.SSO]: getAuthProviderConfig(AuthProvider.SSO),
    [AuthProvider.LOCAL]: getAuthProviderConfig(AuthProvider.LOCAL)
  },

  /**
   * Global security options
   */
  securityOptions: {
    useHttpOnlyCookies: true,
    enableCSRFProtection: true,
    maxAuthRetries: MAX_AUTH_RETRIES,
    tokenEncryptionMethod: 'AES-256-GCM',
    enforceStrongPasswords: true,
    sessionInactivityTimeout: SESSION_TIMEOUT,
    tokenRefreshThreshold: TOKEN_REFRESH_THRESHOLD
  },

  /**
   * Token management functions
   */
  tokenManagement: {
    encryptToken,
    getAuthProviderConfig
  },

  /**
   * Authentication state management configuration
   */
  stateManagement: {
    persistKey: 'auth_state',
    storageType: 'sessionStorage',
    securePersistence: true
  },

  /**
   * Error handling configuration
   */
  errorHandling: {
    maxRetries: MAX_AUTH_RETRIES,
    retryDelay: 1000,
    errorCodes: {
      invalidToken: 'AUTH001',
      sessionExpired: 'AUTH002',
      invalidCredentials: 'AUTH003',
      unauthorized: 'AUTH004'
    }
  }
};