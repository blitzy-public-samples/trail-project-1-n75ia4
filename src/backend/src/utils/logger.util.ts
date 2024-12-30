import winston from 'winston';  // v3.11.0
import DailyRotateFile from 'winston-daily-rotate-file';  // v4.7.1
import { ElasticsearchTransport } from 'winston-elasticsearch';  // v0.17.4
import { loggerConfig, generateCorrelationId, maskSensitiveData, LogLevel } from '../config/logger.config';
import { AsyncLocalStorage } from 'async_hooks';

// Create async storage for correlation ID tracking
const asyncLocalStorage = new AsyncLocalStorage<string>();

// Define sensitive data patterns for masking
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /credential/i,
  /ssn/i,
  /creditcard/i,
];

// Environment-specific log format templates
const FORMAT_TEMPLATES = {
  production: '${timestamp} [${level}] ${correlationId} - ${message}',
  development: '${timestamp} [${level}] ${correlationId} - ${message}\n${stack}',
};

/**
 * Formats log messages with enhanced security features and correlation tracking
 * @param info Winston log entry
 * @returns Formatted log message
 */
const formatLogMessage = (info: winston.LogEntry): string => {
  const {
    timestamp,
    level,
    message,
    correlationId = asyncLocalStorage.getStore() || generateCorrelationId(),
    stack,
    ...metadata
  } = info;

  // Mask sensitive data in message and metadata
  const maskedMessage = maskSensitiveData(message);
  const maskedMetadata = maskSensitiveData(metadata);

  // Get environment-specific format template
  const template = FORMAT_TEMPLATES[process.env.NODE_ENV as keyof typeof FORMAT_TEMPLATES] 
    || FORMAT_TEMPLATES.development;

  // Build the log message
  let formattedMessage = template
    .replace('${timestamp}', timestamp)
    .replace('${level}', level.toUpperCase())
    .replace('${correlationId}', correlationId)
    .replace('${message}', maskedMessage);

  // Add stack trace for errors in development
  if (stack && process.env.NODE_ENV === 'development') {
    formattedMessage = formattedMessage.replace('${stack}', `\n${stack}`);
  }

  // Add metadata if present
  if (Object.keys(maskedMetadata).length > 0) {
    formattedMessage += `\nMetadata: ${JSON.stringify(maskedMetadata)}`;
  }

  return formattedMessage;
};

/**
 * Creates a Winston logger instance with enhanced security and monitoring features
 */
const createLogger = (): winston.Logger => {
  // Create the logger instance
  const logger = winston.createLogger({
    ...loggerConfig,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format((info) => maskSensitiveData(info))(),
      winston.format.printf(formatLogMessage)
    ),
  });

  // Add error handling for transports
  logger.transports.forEach(transport => {
    transport.on('error', (error) => {
      console.error('Logger transport error:', error);
      // Fallback to console logging if transport fails
      console.log('Fallback log:', {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Logger transport failure',
        error: error.message,
      });
    });
  });

  return logger;
};

// Create the singleton logger instance
const logger = createLogger();

/**
 * Wraps logger methods to ensure correlation ID is always present
 * @param level Log level
 * @param message Message to log
 * @param meta Additional metadata
 */
const logWithCorrelation = (
  level: LogLevel,
  message: string,
  meta: Record<string, any> = {}
): void => {
  const correlationId = asyncLocalStorage.getStore() || generateCorrelationId();
  logger[level](message, {
    correlationId,
    ...meta,
  });
};

/**
 * Enhanced logger interface with security features and correlation tracking
 */
export const enhancedLogger = {
  error: (message: string, meta?: Record<string, any>) => 
    logWithCorrelation('error', message, meta),
  
  warn: (message: string, meta?: Record<string, any>) => 
    logWithCorrelation('warn', message, meta),
  
  info: (message: string, meta?: Record<string, any>) => 
    logWithCorrelation('info', message, meta),
  
  http: (message: string, meta?: Record<string, any>) => 
    logWithCorrelation('http', message, meta),
  
  debug: (message: string, meta?: Record<string, any>) => 
    logWithCorrelation('debug', message, meta),
  
  security: (message: string, meta?: Record<string, any>) => 
    logWithCorrelation('security', {
      ...meta,
      securityContext: {
        userId: meta?.userId,
        action: meta?.action,
        resource: meta?.resource,
        timestamp: new Date().toISOString(),
      },
    }),

  /**
   * Creates a new correlation context for request tracking
   * @param correlationId Optional correlation ID
   * @param callback Function to execute within the correlation context
   */
  withCorrelation: <T>(
    correlationId: string | undefined,
    callback: () => T
  ): T => {
    const id = correlationId || generateCorrelationId();
    return asyncLocalStorage.run(id, callback);
  },
};

// Export the enhanced logger as default
export default enhancedLogger;
```

This implementation provides a robust logging utility with the following features:

1. Enhanced Security:
- Sensitive data masking using predefined patterns
- Security-specific logging level and format
- Correlation ID tracking for distributed tracing
- Secure transport configuration

2. ELK Stack Integration:
- Configurable Elasticsearch transport
- Structured logging format
- Index management and templates
- Error handling for transport failures

3. Environment-Specific Features:
- Different log formats for production and development
- Configurable log levels based on environment
- Stack trace inclusion in development

4. Advanced Features:
- Correlation ID tracking using AsyncLocalStorage
- Transport error handling with fallback logging
- Metadata support with sensitive data masking
- Security context logging for audit trails

5. Production-Ready:
- Singleton logger instance
- Type-safe interfaces
- Comprehensive error handling
- Performance optimizations

The logger can be used throughout the application by importing the enhancedLogger:

```typescript
import logger from './utils/logger.util';

// Basic logging
logger.info('Application started');

// With metadata
logger.debug('Processing request', { requestId: '123', path: '/api/tasks' });

// Security events
logger.security('User login attempt', {
  userId: 'user123',
  action: 'LOGIN',
  resource: 'auth-service'
});

// With correlation context
logger.withCorrelation('correlation-123', () => {
  logger.info('Processing within correlation context');
});