/**
 * @fileoverview RabbitMQ message queue configuration module
 * Implements cluster mode support, retry mechanisms, and comprehensive error handling
 * for high availability and reliable event-driven communication between microservices.
 * @version 1.0.0
 */

import { QueueConfig } from '../interfaces/config.interface';

/**
 * Default RabbitMQ configuration object
 * Provides comprehensive queue settings with support for clustering and reliability features
 * @constant
 */
const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  // Core connection settings with environment variable fallbacks
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
  username: process.env.RABBITMQ_USERNAME || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.RABBITMQ_VHOST || '/',

  // High availability and clustering configuration
  clusterMode: process.env.RABBITMQ_CLUSTER_MODE === 'true',
  maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RABBITMQ_RETRY_DELAY || '1000', 10),
  connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT || '30000', 10),
  heartbeatInterval: parseInt(process.env.RABBITMQ_HEARTBEAT_INTERVAL || '60', 10),

  // Security settings
  enableTLS: process.env.RABBITMQ_ENABLE_TLS === 'true',
  certificatePath: process.env.RABBITMQ_CERTIFICATE_PATH || '',
};

/**
 * Queue exchange configuration for different message types
 * Defines exchange settings for various event categories
 */
export const QUEUE_EXCHANGES = {
  TASK_EVENTS: 'task.events',
  NOTIFICATION_EVENTS: 'notification.events',
  SYSTEM_EVENTS: 'system.events',
} as const;

/**
 * Queue routing key patterns for message routing
 * Defines routing patterns for different event types
 */
export const QUEUE_ROUTING_KEYS = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  NOTIFICATION_SENT: 'notification.sent',
  SYSTEM_ALERT: 'system.alert',
} as const;

/**
 * Queue configuration validation function
 * Validates the provided configuration against required parameters
 * @param config - Queue configuration object
 * @returns boolean indicating if the configuration is valid
 */
const validateQueueConfig = (config: QueueConfig): boolean => {
  const requiredFields: (keyof QueueConfig)[] = [
    'host',
    'port',
    'username',
    'password',
    'vhost',
  ];

  return requiredFields.every((field) => {
    const value = config[field];
    return value !== undefined && value !== null && value !== '';
  });
};

/**
 * Processed queue configuration with validation
 * Validates and exports the final queue configuration
 */
export const queueConfig: QueueConfig = (() => {
  if (!validateQueueConfig(DEFAULT_QUEUE_CONFIG)) {
    throw new Error('Invalid queue configuration: Missing required fields');
  }

  // Apply production-specific overrides if needed
  if (process.env.NODE_ENV === 'production') {
    return {
      ...DEFAULT_QUEUE_CONFIG,
      // Enforce TLS in production
      enableTLS: true,
      // Increase retry attempts in production
      maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES || '5', 10),
      // Extend connection timeout in production
      connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT || '60000', 10),
    };
  }

  return DEFAULT_QUEUE_CONFIG;
})();

/**
 * Queue assertion configuration
 * Defines settings for queue declaration and binding
 */
export const QUEUE_ASSERTION_CONFIG = {
  // Queue durability settings
  durable: true,
  // Auto-delete settings
  autoDelete: false,
  // Message expiration (24 hours)
  messageTtl: 86400000,
  // Dead letter exchange
  deadLetterExchange: 'dlx.exchange',
  // Maximum queue length
  maxLength: 10000,
} as const;

/**
 * Queue consumer configuration
 * Defines settings for message consumption
 */
export const QUEUE_CONSUMER_CONFIG = {
  // Prefetch count for fair dispatch
  prefetchCount: 10,
  // Consumer timeout
  consumerTimeout: 30000,
  // Acknowledgment settings
  noAck: false,
  // Consumer tag prefix
  consumerTagPrefix: 'task-management-system',
} as const;