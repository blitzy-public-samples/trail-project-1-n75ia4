/**
 * @fileoverview Redis-based distributed caching service implementation
 * Provides high-performance data caching with cluster support, encryption,
 * and comprehensive monitoring capabilities.
 * @version 1.0.0
 */

import Redis, { Cluster, ClusterNode, RedisOptions } from 'ioredis'; // v5.3.0
import { cacheConfig } from '../config/cache.config';
import { enhancedLogger as logger } from '../utils/logger.util';
import crypto from 'crypto';

/**
 * Interface for cache metrics collection
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  latency: number[];
  errors: number;
  size: number;
}

/**
 * Enhanced Redis cache service with high availability and monitoring
 */
export class CacheService {
  private client: Redis | Cluster;
  private metrics: CacheMetrics;
  private readonly encryptionKey: Buffer;
  private readonly iv: Buffer;
  private isConnected: boolean;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      latency: [],
      errors: 0,
      size: 0
    };
    this.isConnected = false;

    // Initialize encryption key and IV for sensitive data
    this.encryptionKey = crypto.scryptSync(cacheConfig.password || 'default-key', 'salt', 32);
    this.iv = crypto.randomBytes(16);

    // Initialize Redis client with appropriate configuration
    const redisOptions: RedisOptions = {
      host: cacheConfig.host,
      port: cacheConfig.port,
      password: cacheConfig.password,
      retryStrategy: (times: number) => {
        if (times > cacheConfig.maxRetries) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      connectTimeout: cacheConfig.connectionTimeout,
      lazyConnect: true,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined
    };

    // Initialize client based on cluster mode configuration
    this.client = cacheConfig.clusterMode
      ? new Redis.Cluster([{ host: cacheConfig.host, port: cacheConfig.port }], {
          redisOptions,
          clusterRetryStrategy: (times: number) => {
            if (times > cacheConfig.maxRetries) {
              return null;
            }
            return Math.min(times * 100, 3000);
          }
        })
      : new Redis(redisOptions);

    this.setupEventHandlers();
  }

  /**
   * Sets up Redis client event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error: Error) => {
      logger.error('Redis client error', { error: error.message });
      this.metrics.errors++;
      this.isConnected = false;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.startHealthCheck();
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Starts periodic health check monitoring
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.client.ping();
        logger.debug('Redis health check passed');
      } catch (error) {
        logger.error('Redis health check failed', { error });
        this.metrics.errors++;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Encrypts sensitive data before caching
   */
  private encrypt(data: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, this.iv);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('base64');
  }

  /**
   * Decrypts sensitive data from cache
   */
  private decrypt(data: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, this.iv);
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final()
    ]).toString();
  }

  /**
   * Establishes connection to Redis server
   */
  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Successfully connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  /**
   * Stores value in cache with optional encryption
   */
  public async set<T>(
    key: string,
    value: T,
    ttl: number = cacheConfig.ttl,
    encrypt: boolean = false
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const cacheKey = `${cacheConfig.keyPrefix}${key}`;
      const stringValue = JSON.stringify(value);
      const cacheValue = encrypt ? this.encrypt(stringValue) : stringValue;

      await this.client.set(cacheKey, cacheValue, 'EX', ttl);
      this.metrics.size++;

      const latency = Date.now() - startTime;
      this.metrics.latency.push(latency);
      logger.debug('Cache set operation completed', { key, latency });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache set operation failed', { key, error });
      throw error;
    }
  }

  /**
   * Retrieves value from cache with optional decryption
   */
  public async get<T>(key: string, decrypt: boolean = false): Promise<T | null> {
    const startTime = Date.now();
    try {
      const cacheKey = `${cacheConfig.keyPrefix}${key}`;
      const value = await this.client.get(cacheKey);

      if (!value) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      const latency = Date.now() - startTime;
      this.metrics.latency.push(latency);

      const parsedValue = decrypt ? this.decrypt(value) : value;
      return JSON.parse(parsedValue) as T;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache get operation failed', { key, error });
      throw error;
    }
  }

  /**
   * Removes value from cache
   */
  public async delete(key: string): Promise<void> {
    try {
      const cacheKey = `${cacheConfig.keyPrefix}${key}`;
      await this.client.del(cacheKey);
      this.metrics.size = Math.max(0, this.metrics.size - 1);
      logger.debug('Cache delete operation completed', { key });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache delete operation failed', { key, error });
      throw error;
    }
  }

  /**
   * Retrieves cache metrics
   */
  public getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      latency: this.metrics.latency.slice(-100) // Keep last 100 latency measurements
    };
  }

  /**
   * Checks cache health status
   */
  public async getHealth(): Promise<boolean> {
    try {
      await this.client.ping();
      return this.isConnected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gracefully closes Redis connection
   */
  public async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    await this.client.quit();
    this.isConnected = false;
    logger.info('Redis client disconnected');
  }
}

export default CacheService;