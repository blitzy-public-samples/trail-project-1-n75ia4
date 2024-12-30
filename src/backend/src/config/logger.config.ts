import winston from 'winston';  // v3.11.0
import DailyRotateFile from 'winston-daily-rotate-file';  // v4.7.1
import { ElasticsearchTransport } from 'winston-elasticsearch';  // v0.17.4
import path from 'path';
import crypto from 'crypto';

// Define log levels with security level
const LOG_LEVELS = {
  error: 0,
  security: 1,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Sensitive fields that should be masked in logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'creditCard',
  'ssn',
  'accessToken',
  'refreshToken',
];

// Default log format template
const DEFAULT_LOG_FORMAT = '${timestamp} [${level}] [${correlationId}] ${message}${stack}';

/**
 * Generates a correlation ID for distributed tracing
 * @returns {string} Unique correlation ID
 */
const generateCorrelationId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Determines appropriate log level based on environment
 * @returns {string} Environment-appropriate log level
 */
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return 'warn';
    case 'staging':
      return 'info';
    default:
      return 'debug';
  }
};

/**
 * Masks sensitive information in log messages
 * @param {any} info Log information object
 * @returns {any} Sanitized log information
 */
const maskSensitiveData = (info: any): any => {
  const masked = { ...info };
  
  const mask = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        mask(obj[key]);
      } else if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        obj[key] = '********';
      }
    }
  };

  mask(masked);
  return masked;
};

/**
 * Generates comprehensive log format with security and tracing features
 */
const getLogFormat = () => {
  return winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format(maskSensitiveData)(),
    winston.format.metadata({
      fillWith: ['timestamp', 'correlationId', 'level', 'message']
    }),
    winston.format.json()
  );
};

/**
 * Advanced configuration class for Winston logger with security and monitoring features
 */
class LoggerConfig {
  private level: string;
  private format: winston.Logform.Format;
  private errorLogPath: string;
  private combinedLogPath: string;
  private transports: winston.transport[];
  private elkConfig: any;
  private securityConfig: any;

  constructor() {
    this.level = getLogLevel();
    this.format = getLogFormat();
    this.errorLogPath = path.join(process.cwd(), 'logs', 'error');
    this.combinedLogPath = path.join(process.cwd(), 'logs', 'combined');
    this.elkConfig = this.getElkConfig();
    this.securityConfig = this.getSecurityConfig();
    this.transports = this.getTransports();
  }

  /**
   * Configures ELK Stack integration
   */
  private getElkConfig() {
    return {
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        },
        ssl: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      },
      indexPrefix: 'task-management-logs',
      indexSuffixPattern: 'YYYY.MM.DD',
      mappingTemplate: {
        index_patterns: ['task-management-logs-*'],
        settings: {
          number_of_shards: 2,
          number_of_replicas: 1,
        },
      },
    };
  }

  /**
   * Configures security-specific logging
   */
  private getSecurityConfig() {
    return {
      level: 'security',
      filename: path.join(process.cwd(), 'logs', 'security', 'security.log'),
      maxFiles: '30d',
      maxSize: '100m',
      tailable: true,
      zippedArchive: true,
    };
  }

  /**
   * Configures secure logging transports with monitoring integration
   */
  private getTransports(): winston.transport[] {
    const transports: winston.transport[] = [
      // Console Transport
      new winston.transports.Console({
        level: this.level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),

      // Error Log File Transport
      new DailyRotateFile({
        level: 'error',
        filename: `${this.errorLogPath}/%DATE%-error.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true,
      }),

      // Combined Log File Transport
      new DailyRotateFile({
        filename: `${this.combinedLogPath}/%DATE%-combined.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true,
      }),

      // Security Log Transport
      new DailyRotateFile(this.securityConfig),
    ];

    // Add ELK Stack Transport in non-development environments
    if (process.env.NODE_ENV !== 'development') {
      transports.push(
        new ElasticsearchTransport(this.elkConfig)
      );
    }

    return transports;
  }

  /**
   * Returns the complete logger configuration
   */
  public getConfig(): winston.LoggerOptions {
    return {
      levels: LOG_LEVELS,
      level: this.level,
      format: this.format,
      transports: this.transports,
      exitOnError: false,
      silent: process.env.NODE_ENV === 'test',
      defaultMeta: {
        service: 'task-management-service',
        environment: process.env.NODE_ENV,
        correlationId: generateCorrelationId(),
      },
    };
  }
}

// Export the logger configuration
export const loggerConfig = new LoggerConfig().getConfig();

// Export types and utilities for external use
export type LogLevel = keyof typeof LOG_LEVELS;
export { generateCorrelationId, maskSensitiveData };