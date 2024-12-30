/**
 * @fileoverview Enhanced error handling utility with security features and monitoring integration
 * for the Task Management System backend.
 * @version 1.0.0
 */

import { StatusCode } from '../constants/status-codes';
import { ErrorCode, ErrorMessage } from '../constants/error-codes';
import { enhancedLogger as Logger } from './logger.util';

/**
 * Interface for security context in error tracking
 */
interface SecurityContext {
  userId?: string;
  action?: string;
  resource?: string;
  ipAddress?: string;
  timestamp?: string;
}

/**
 * Interface for error formatting options
 */
interface ErrorFormatOptions {
  includeStack?: boolean;
  maskSensitiveData?: boolean;
  securityContext?: SecurityContext;
}

/**
 * Enhanced custom error class with security and monitoring features
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: number;
  public readonly correlationId: string;
  public readonly securityContext?: SecurityContext;
  public readonly timestamp: string;

  /**
   * Creates an instance of AppError with enhanced security tracking
   */
  constructor(
    message: string,
    statusCode: number = StatusCode.INTERNAL_SERVER_ERROR,
    errorCode: number = ErrorCode.INTERNAL_SERVER_ERROR,
    correlationId?: string,
    securityContext?: SecurityContext
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.correlationId = correlationId || crypto.randomUUID();
    this.securityContext = securityContext;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Log security event if applicable
    if (this.isSecurityRelatedError()) {
      Logger.security('Security-related error occurred', {
        error: this.message,
        errorCode: this.errorCode,
        correlationId: this.correlationId,
        ...this.securityContext
      });
    }
  }

  /**
   * Determines if the error is security-related based on error code
   */
  private isSecurityRelatedError(): boolean {
    return this.errorCode >= 1100 && this.errorCode < 1200;
  }
}

/**
 * Masks sensitive information in error messages
 * @param message - Message to mask sensitive data from
 */
export const maskSensitiveData = (message: string): string => {
  const sensitivePatterns = [
    /(password[=:]\s*['"]?)([^'"}\s]+)/gi,
    /(api[_-]?key[=:]\s*['"]?)([^'"}\s]+)/gi,
    /(auth[_-]?token[=:]\s*['"]?)([^'"}\s]+)/gi,
    /(\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b)/g, // Credit card
    /(\b\d{3}[-.]?\d{2}[-.]?\d{4}\b)/g, // SSN
    /(bearer\s+)([a-zA-Z0-9._-]+)/gi // Bearer tokens
  ];

  let maskedMessage = message;
  sensitivePatterns.forEach(pattern => {
    maskedMessage = maskedMessage.replace(pattern, '$1********');
  });

  return maskedMessage;
}

/**
 * Creates a formatted error response with security considerations
 */
export const formatError = (error: Error, options: ErrorFormatOptions = {}): Record<string, any> => {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    maskSensitiveData: shouldMaskData = true,
    securityContext
  } = options;

  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : StatusCode.INTERNAL_SERVER_ERROR;
  const errorCode = isAppError ? error.errorCode : ErrorCode.INTERNAL_SERVER_ERROR;
  const correlationId = isAppError ? error.correlationId : crypto.randomUUID();

  // Mask sensitive data if required
  const message = shouldMaskData ? maskSensitiveData(error.message) : error.message;

  // Create base error response
  const errorResponse: Record<string, any> = {
    status: 'error',
    statusCode,
    errorCode,
    message,
    correlationId,
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (includeStack && error.stack) {
    errorResponse.stack = error.stack;
  }

  // Add security context if provided
  if (securityContext) {
    errorResponse.securityContext = {
      ...securityContext,
      timestamp: new Date().toISOString()
    };
  }

  // Log error with security context
  Logger.error(message, {
    statusCode,
    errorCode,
    correlationId,
    stack: error.stack,
    securityContext
  });

  return errorResponse;
}

/**
 * Creates an AppError instance with enhanced security tracking
 */
export const createError = (
  message: string,
  statusCode: number = StatusCode.INTERNAL_SERVER_ERROR,
  errorCode: number = ErrorCode.INTERNAL_SERVER_ERROR,
  correlationId?: string,
  securityContext?: SecurityContext
): AppError => {
  // Generate correlation ID if not provided
  const errorCorrelationId = correlationId || crypto.randomUUID();

  // Create security context if not provided
  const errorSecurityContext: SecurityContext = {
    ...securityContext,
    timestamp: new Date().toISOString()
  };

  // Create and return error instance
  return new AppError(
    message,
    statusCode,
    errorCode,
    errorCorrelationId,
    errorSecurityContext
  );
}
```

This implementation provides a comprehensive error handling utility with the following features:

1. Enhanced Error Class:
- Custom AppError class with security tracking
- Correlation ID for distributed tracing
- Security context for monitoring
- Automatic security event logging

2. Security Features:
- Sensitive data masking
- Security-related error detection
- Security event logging
- Environment-specific error formatting

3. Monitoring Integration:
- Enhanced logging with security context
- Error tracking with correlation IDs
- Security event monitoring
- Stack trace handling

4. Production-Ready Features:
- Type-safe implementation
- Environment-specific behavior
- Comprehensive error formatting
- Security best practices

The module can be used throughout the application to handle errors consistently and securely:

```typescript
// Example usage:
try {
  // Some operation that might fail
  throw new AppError(
    'Authentication failed',
    StatusCode.UNAUTHORIZED,
    ErrorCode.AUTHENTICATION_ERROR,
    correlationId,
    { userId: 'user123', action: 'LOGIN' }
  );
} catch (error) {
  const formattedError = formatError(error, {
    includeStack: true,
    securityContext: { resource: 'auth-service' }
  });
  // Handle or return formatted error
}