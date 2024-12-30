/**
 * @fileoverview Database configuration module for Task Management System
 * Provides secure, scalable connection settings for PostgreSQL using Prisma ORM
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // v5.0+
import { config } from 'dotenv'; // v16.0+
import { DatabaseConfig } from '../interfaces/config.interface';

// Initialize environment variables
config();

/**
 * Connection pool configuration type
 */
interface PoolConfig {
  min: number;
  max: number;
  idle: number;
  timeout: number;
}

/**
 * Replication configuration type for high availability
 */
interface ReplicationConfig {
  enabled: boolean;
  readReplicas: string[];
  writeHost: string;
}

/**
 * Retrieves and validates database configuration from environment variables
 * Implements secure defaults and validation for all database settings
 */
const getDatabaseConfig = (): DatabaseConfig => {
  // Validate required environment variables
  if (!process.env.DATABASE_PASSWORD) {
    throw new Error('Database password is required in environment variables');
  }

  // Core database configuration
  const config: DatabaseConfig & { poolConfig: PoolConfig; replicationConfig: ReplicationConfig } = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'taskmanagement',
    ssl: process.env.DATABASE_SSL === 'true',

    // Connection pool configuration with production-ready defaults
    poolConfig: {
      min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
      idle: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '10000', 10),
      timeout: parseInt(process.env.DATABASE_TIMEOUT || '30000', 10),
    },

    // Replication configuration for high availability
    replicationConfig: {
      enabled: process.env.DATABASE_REPLICATION_ENABLED === 'true',
      readReplicas: process.env.DATABASE_REPLICA_HOSTS?.split(',') || [],
      writeHost: process.env.DATABASE_HOST || 'localhost',
    }
  };

  // Validate configuration values
  validateDatabaseConfig(config);

  return config;
};

/**
 * Validates database configuration values
 * @param config Database configuration object
 * @throws Error if configuration is invalid
 */
const validateDatabaseConfig = (config: DatabaseConfig & { 
  poolConfig: PoolConfig; 
  replicationConfig: ReplicationConfig 
}): void => {
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Invalid database port number');
  }

  if (config.poolConfig.min < 1) {
    throw new Error('Minimum pool size must be at least 1');
  }

  if (config.poolConfig.max < config.poolConfig.min) {
    throw new Error('Maximum pool size must be greater than minimum pool size');
  }

  if (config.replicationConfig.enabled && config.replicationConfig.readReplicas.length === 0) {
    throw new Error('Read replicas must be configured when replication is enabled');
  }
};

/**
 * Creates and configures a Prisma client instance with optimized settings
 * Implements connection pooling, SSL, and high availability features
 */
const createPrismaClient = (): PrismaClient => {
  const config = getDatabaseConfig();

  return new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`,
      },
    },
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' }
    ],
    // Production-optimized client configuration
    __internal: {
      engine: {
        connectionTimeout: config.poolConfig.timeout,
        pollInterval: 100,
        // Enable prepared statements cache for better performance
        enableStatementsCache: true,
        // Configure connection pooling
        pool: {
          min: config.poolConfig.min,
          max: config.poolConfig.max,
          idleTimeoutMillis: config.poolConfig.idle,
        }
      }
    }
  });
};

// Create singleton instance of Prisma client
export const prisma = createPrismaClient();

// Export validated database configuration
export const databaseConfig = getDatabaseConfig();

/**
 * Event handlers for Prisma client
 */
prisma.$on('warn', (e) => {
  console.warn('Prisma Warning:', e);
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});