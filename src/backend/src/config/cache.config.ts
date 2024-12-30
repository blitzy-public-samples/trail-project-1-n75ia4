/**
 * @fileoverview Redis cache configuration for the Task Management System
 * Implements distributed caching layer with enhanced security, performance optimization,
 * and high availability features to support system performance requirements.
 * @version 1.0.0
 * @requires redis v4.6.7
 */

import { CacheConfig } from '../interfaces/config.interface';

/**
 * Validates cache configuration settings for security and performance
 * @param config - Cache configuration object to validate
 * @returns boolean indicating if configuration is valid
 */
const validateCacheConfig = (config: CacheConfig): boolean => {
  try {
    // Host validation
    if (!config.host || !/^[a-zA-Z0-9.-]+$/.test(config.host)) {
      throw new Error('Invalid cache host configuration');
    }

    // Port validation
    if (config.port < 1 || config.port > 65535) {
      throw new Error('Invalid cache port configuration');
    }

    // Password validation in production
    if (process.env.NODE_ENV === 'production' && !config.password) {
      throw new Error('Redis password is required in production');
    }

    // TTL validation
    if (config.ttl < 0 || config.ttl > 86400) { // Max 24 hours
      throw new Error('Invalid TTL configuration');
    }

    // Connection pool validation
    if (config.connectionPoolSize < 5 || config.connectionPoolSize > 100) {
      throw new Error('Invalid connection pool size');
    }

    return true;
  } catch (error) {
    console.error('Cache configuration validation failed:', error);
    return false;
  }
};

/**
 * Redis cache configuration object implementing CacheConfig interface
 * Optimized for high performance and availability with security best practices
 */
export const cacheConfig: CacheConfig = {
  // Core connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,

  // Cache behavior settings
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // Default 1 hour
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'tms:', // Task Management System prefix

  // High availability settings
  clusterMode: process.env.REDIS_CLUSTER_MODE === 'true',
  sentinelMode: process.env.REDIS_SENTINEL_MODE === 'true',
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10), // 1 second

  // Performance optimization settings
  connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000', 10), // 5 seconds
  connectionPoolSize: parseInt(process.env.REDIS_POOL_SIZE || '10', 10),

  // Security settings
  enableTLS: process.env.NODE_ENV === 'production' ? true : 
             (process.env.REDIS_ENABLE_TLS === 'true')
};

// Validate configuration on initialization
if (!validateCacheConfig(cacheConfig)) {
  throw new Error('Invalid cache configuration detected');
}

// Freeze configuration object to prevent runtime modifications
Object.freeze(cacheConfig);

export default cacheConfig;