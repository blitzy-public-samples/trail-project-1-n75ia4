/**
 * @fileoverview Central configuration module for Task Management System
 * Aggregates, validates, and exports all application configurations with enhanced security
 * @version 1.0.0
 * @requires dotenv ^16.3.1
 */

import { config as dotenvConfig } from 'dotenv'; // v16.3.1
import { createHash, randomBytes } from 'crypto';
import { authConfig } from './auth.config';
import { cacheConfig } from './cache.config';
import { databaseConfig } from './database.config';
import { emailConfig } from './email.config';
import { storageConfig } from './storage.config';

// Initialize environment variables
dotenvConfig();

// Environment type definition
type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Global configuration constants
 */
const NODE_ENV = (process.env.NODE_ENV || 'development') as Environment;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const CONFIG_VERSION = process.env.CONFIG_VERSION || '1.0';

/**
 * Validates environment-specific configuration requirements
 * @throws Error if environment validation fails
 */
const validateEnvironment = (): void => {
  // Production environment validations
  if (NODE_ENV === 'production') {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is required in production environment');
    }

    // Validate encryption key strength
    const keyStrength = createHash('sha256').update(ENCRYPTION_KEY).digest('hex');
    if (Buffer.from(keyStrength, 'hex').length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 256 bits strong');
    }

    // Validate required security configurations
    if (!authConfig.mfaEnabled) {
      throw new Error('MFA must be enabled in production environment');
    }

    if (!cacheConfig.enableTLS) {
      throw new Error('TLS must be enabled for Redis in production');
    }
  }
};

/**
 * Encrypts sensitive configuration values
 * @param data - Data to encrypt
 * @param key - Encryption key
 * @returns Encrypted value as string
 */
const encryptSensitiveData = (data: any, key: string): string => {
  const iv = randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  });
};

/**
 * Comprehensive configuration validation
 * @throws Error if any configuration validation fails
 */
const validateConfigurations = (): void => {
  try {
    // Validate environment configuration
    validateEnvironment();

    // Validate all imported configurations
    if (!authConfig.jwtSecret || !authConfig.clientId || !authConfig.clientSecret) {
      throw new Error('Invalid authentication configuration');
    }

    if (!cacheConfig.host || !cacheConfig.port) {
      throw new Error('Invalid cache configuration');
    }

    if (!databaseConfig.host || !databaseConfig.port) {
      throw new Error('Invalid database configuration');
    }

    if (!emailConfig.host || !emailConfig.auth) {
      throw new Error('Invalid email configuration');
    }

    if (!storageConfig.bucket || !storageConfig.region) {
      throw new Error('Invalid storage configuration');
    }

  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw error;
  }
};

// Validate all configurations on module load
validateConfigurations();

/**
 * Central configuration object combining all validated configurations
 * with environment-specific settings and security measures
 */
export const config = {
  version: CONFIG_VERSION,
  environment: NODE_ENV,
  
  // Core service configurations
  auth: authConfig,
  cache: cacheConfig,
  database: databaseConfig,
  email: emailConfig,
  storage: storageConfig,

  // Environment-specific settings
  security: {
    encryptionEnabled: NODE_ENV === 'production',
    mfaRequired: NODE_ENV === 'production',
    sslRequired: NODE_ENV === 'production',
    minPasswordLength: 12,
    maxLoginAttempts: 5,
    sessionTimeout: 30 // minutes
  },

  // System settings
  system: {
    timezone: process.env.TZ || 'UTC',
    locale: process.env.LOCALE || 'en-US',
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

// Freeze configuration to prevent runtime modifications
Object.freeze(config);
Object.freeze(config.security);
Object.freeze(config.system);

// Export the central configuration object
export default config;

// Export individual configurations for convenience
export {
  authConfig,
  cacheConfig,
  databaseConfig,
  emailConfig,
  storageConfig
};

/**
 * Export environment check utilities
 */
export const isProduction = (): boolean => NODE_ENV === 'production';
export const isStaging = (): boolean => NODE_ENV === 'staging';
export const isDevelopment = (): boolean => NODE_ENV === 'development';
export const isTest = (): boolean => NODE_ENV === 'test';