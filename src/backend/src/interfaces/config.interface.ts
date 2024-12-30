/**
 * @fileoverview Core configuration interfaces for the Task Management System
 * Defines the structure of various configuration objects used throughout the application
 * @version 1.0.0
 */

/**
 * Authentication configuration interface
 * Defines settings for JWT, SSO, and MFA authentication mechanisms
 */
export interface AuthConfig {
  /** Secret key for JWT token signing */
  jwtSecret: string;
  
  /** JWT token expiration time (e.g., '1h', '7d') */
  jwtExpiresIn: string;
  
  /** Refresh token expiration time */
  refreshTokenExpiresIn: string;
  
  /** SSO provider name (e.g., 'auth0', 'okta') */
  ssoProvider: string;
  
  /** OAuth/SSO client identifier */
  clientId: string;
  
  /** OAuth/SSO client secret */
  clientSecret: string;
  
  /** Flag to enable/disable Multi-Factor Authentication */
  mfaEnabled: boolean;
  
  /** Session timeout in minutes */
  sessionTimeout: number;
}

/**
 * Database configuration interface
 * Defines PostgreSQL connection and replication settings
 */
export interface DatabaseConfig {
  /** Database host address */
  host: string;
  
  /** Database port number */
  port: number;
  
  /** Database username */
  username: string;
  
  /** Database password */
  password: string;
  
  /** Database name */
  database: string;
  
  /** Enable SSL connection */
  ssl: boolean;
  
  /** Connection pool size */
  poolSize: number;
  
  /** Enable database replication */
  replicationEnabled: boolean;
}

/**
 * Cache configuration interface
 * Defines Redis cache settings including cluster and sentinel configuration
 */
export interface CacheConfig {
  /** Redis host address */
  host: string;
  
  /** Redis port number */
  port: number;
  
  /** Redis password */
  password: string;
  
  /** Cache TTL in seconds */
  ttl: number;
  
  /** Enable Redis cluster mode */
  clusterMode: boolean;
  
  /** Maximum retry attempts for failed operations */
  maxRetries: number;
  
  /** Delay between retry attempts in milliseconds */
  retryDelay: number;
  
  /** Prefix for cache keys */
  keyPrefix: string;
  
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  
  /** Enable Redis sentinel for high availability */
  sentinelEnabled: boolean;
}

/**
 * Email configuration interface
 * Defines email service settings including SMTP and template configuration
 */
export interface EmailConfig {
  /** SMTP server host */
  host: string;
  
  /** SMTP server port */
  port: number;
  
  /** Enable secure SMTP connection */
  secure: boolean;
  
  /** SMTP authentication credentials */
  auth: {
    /** SMTP username */
    user: string;
    /** SMTP password */
    pass: string;
  };
  
  /** Default sender email address */
  from: string;
  
  /** Email templates directory path */
  templateDir: string;
  
  /** Number of retry attempts for failed email sending */
  retryAttempts: number;
}