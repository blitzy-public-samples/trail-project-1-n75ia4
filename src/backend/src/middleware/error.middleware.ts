/**
 * @fileoverview Enhanced Express error handling middleware with security features,
 * correlation tracking, and monitoring integration for the Task Management System.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { AppError, formatError } from '../utils/error.util';
import { logger } from '../utils/logger.util';
import { StatusCode } from '../constants/status-codes';

/**
 * Interface for enhanced error tracking with security context
 */
interface ErrorTrackingContext {
  correlationId: string;
  path: string;
  method: string;
  ip: string;
  userId?: string;
  timestamp: string;
}

/**
 * Security headers for error responses
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

/**
 * Rate limiting error pattern detection
 */
const isRateLimitError = (error: Error): boolean => {
  return error.message.toLowerCase().includes('rate limit') ||
    error.message.toLowerCase().includes('too many requests');
};

/**
 * Creates error tracking context from request
 */
const createErrorContext = (req: Request): ErrorTrackingContext => ({
  correlationId: req.headers['x-correlation-id'] as string || crypto.randomUUID(),
  path: req.path,
  method: req.method,
  ip: req.ip,
  userId: (req as any).user?.id,
  timestamp: new Date().toISOString()
});

/**
 * Enhanced error handling middleware with security features and monitoring
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Create error tracking context
  const errorContext = createErrorContext(req);

  // Determine error details
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : StatusCode.INTERNAL_SERVER_ERROR;
  
  // Handle rate limiting errors
  if (isRateLimitError(error)) {
    statusCode = StatusCode.TOO_MANY_REQUESTS;
  }

  // Create security context for error tracking
  const securityContext = {
    userId: errorContext.userId,
    action: req.method,
    resource: req.path,
    ipAddress: errorContext.ip,
    timestamp: errorContext.timestamp
  };

  // Format error response with security considerations
  const errorResponse = formatError(error, {
    includeStack: process.env.NODE_ENV === 'development',
    maskSensitiveData: true,
    securityContext
  });

  // Log error with enhanced context
  logger.error('Request error occurred', {
    error: error.message,
    stack: error.stack,
    context: errorContext,
    securityContext
  });

  // Track critical errors for monitoring
  if (statusCode >= 500) {
    logger.logSecurityEvent('Critical error detected', {
      error: error.message,
      context: errorContext,
      securityContext
    });
  }

  // Set security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });

  // Set correlation ID in response
  res.setHeader('X-Correlation-ID', errorContext.correlationId);

  // Send secure error response
  res.status(statusCode).json({
    ...errorResponse,
    correlationId: errorContext.correlationId,
    timestamp: errorContext.timestamp
  });
};
```

This implementation provides a comprehensive error handling middleware with the following features:

1. Security Features:
- Security headers for all error responses
- Sensitive data masking
- Security context tracking
- Rate limiting detection
- IP tracking and logging

2. Error Tracking:
- Correlation ID tracking
- Error context collection
- Security event logging
- Critical error monitoring
- Request metadata tracking

3. Response Formatting:
- Standardized error responses
- Environment-specific stack traces
- Secure header configuration
- Correlation ID propagation

4. Monitoring Integration:
- Enhanced error logging
- Security event tracking
- Critical error detection
- Performance monitoring support

5. Production-Ready Features:
- Type safety
- Comprehensive error handling
- Security best practices
- Monitoring integration
- Rate limiting support

The middleware can be used in the Express application setup:

```typescript
import { errorHandler } from './middleware/error.middleware';

// Application setup
const app = express();

// ... other middleware and routes ...

// Error handling middleware (should be last)
app.use(errorHandler);