/**
 * @fileoverview Storage configuration module for AWS S3 integration
 * Defines secure storage settings, bucket configuration, and access credentials
 * with environment-specific configurations and security policies
 * @version 1.0.0
 */

import { StorageConfig } from '../interfaces/config.interface';

/**
 * Required environment variables for storage configuration
 * These must be set in the environment before application startup
 */
const REQUIRED_ENV_VARS = [
  'AWS_S3_BUCKET',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
] as const;

/**
 * Validates storage configuration and environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
function validateStorageConfig(): void {
  // Check for required environment variables
  const missingVars = REQUIRED_ENV_VARS.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate AWS region format
  const regionRegex = /^[a-z]{2}-[a-z]+-\d{1}$/;
  if (!regionRegex.test(process.env.AWS_REGION!)) {
    throw new Error('Invalid AWS region format');
  }

  // Validate bucket name format
  const bucketRegex = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/;
  if (!bucketRegex.test(process.env.AWS_S3_BUCKET!)) {
    throw new Error('Invalid S3 bucket name format');
  }
}

// Validate configuration on module load
validateStorageConfig();

/**
 * Storage configuration object implementing StorageConfig interface
 * Includes comprehensive settings for AWS S3 integration with security
 * and lifecycle policies
 */
export const storageConfig: StorageConfig = {
  // Storage provider identifier
  provider: 'aws-s3',

  // S3 bucket configuration
  bucket: process.env.AWS_S3_BUCKET!,
  region: process.env.AWS_REGION!,
  
  // AWS credentials (accessed from environment variables)
  accessKey: process.env.AWS_ACCESS_KEY_ID!,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY!,

  // Encryption configuration for data at rest
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    serverSideEncryption: 'AES256',
    // Additional encryption settings can be added here
  },

  // Lifecycle policies for cost optimization
  lifecycle: {
    enabled: true,
    rules: [
      {
        // Move uploads to STANDARD_IA after 30 days
        prefix: 'uploads/',
        transition: {
          days: 30,
          storageClass: 'STANDARD_IA'
        }
      },
      {
        // Archive old logs after 90 days
        prefix: 'logs/',
        transition: {
          days: 90,
          storageClass: 'GLACIER'
        }
      }
    ]
  },

  // Additional optional configurations
  cors: {
    enabled: true,
    maxAge: 3600,
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ],
    allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
    allowedHeaders: ['*']
  },

  // Versioning configuration
  versioning: {
    enabled: true,
    mfaDelete: process.env.NODE_ENV === 'production' // Require MFA for deletions in production
  }
};

// Freeze the configuration object to prevent modifications
Object.freeze(storageConfig);