import { Request, Response, NextFunction } from 'express'; // v4.18.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { logger } from '../utils/logger.util';

// Paths to exclude from logging to reduce noise and improve performance
const EXCLUDED_PATHS = ['/health', '/metrics', '/favicon.ico', '/ready'];

// Headers that contain sensitive information that should be masked
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-session-id',
  'x-csrf-token'
];

// Sampling rate for high-traffic routes (10%)
const LOG_SAMPLING_RATE = 0.1;

// Performance threshold in milliseconds
const PERFORMANCE_THRESHOLD_MS = 200;

/**
 * Masks sensitive data in objects by replacing values with [REDACTED]
 * @param data Object containing potentially sensitive data
 * @param sensitiveFields Array of field names to mask
 * @returns Masked copy of the object
 */
const maskSensitiveData = (
  data: Record<string, any>,
  sensitiveFields: string[]
): Record<string, any> => {
  const masked = JSON.parse(JSON.stringify(data));
  
  const maskObject = (obj: Record<string, any>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        maskObject(value);
      }
    }
  };

  maskObject(masked);
  return masked;
};

/**
 * Express middleware for enhanced HTTP request/response logging with security
 * monitoring and performance tracking
 */
const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip logging for excluded paths
  if (EXCLUDED_PATHS.includes(req.path)) {
    return next();
  }

  // Generate correlation ID for request tracking
  const correlationId = uuidv4();
  req.correlationId = correlationId;

  // Create security context
  const securityContext = {
    correlationId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  };

  // Record request start time with high precision
  const startTime = process.hrtime();

  // Mask sensitive headers
  const maskedHeaders = maskSensitiveData(
    { ...req.headers },
    SENSITIVE_HEADERS
  );

  // Log incoming request with security context
  logger.http('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    headers: maskedHeaders,
    securityContext
  });

  // Override response.end to capture and log response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: string | undefined, cb?: (() => void) | undefined): Response {
    // Calculate request duration with nanosecond precision
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const durationMs = (seconds * 1000) + (nanoseconds / 1000000);

    // Check if we should sample this request for logging
    const shouldLog = Math.random() < LOG_SAMPLING_RATE;

    try {
      // Log performance warning if threshold exceeded
      if (durationMs > PERFORMANCE_THRESHOLD_MS) {
        logger.performance('Request exceeded performance threshold', {
          correlationId,
          path: req.path,
          method: req.method,
          durationMs,
          threshold: PERFORMANCE_THRESHOLD_MS
        });
      }

      // Log response details if sampled
      if (shouldLog) {
        logger.http('Outgoing response', {
          correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
          contentLength: res.get('content-length'),
          securityContext
        });
      }

      // Log security events for specific status codes
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.security('Authentication/Authorization failure', {
          correlationId,
          statusCode: res.statusCode,
          path: req.path,
          method: req.method,
          securityContext
        });
      }
    } catch (error) {
      // Log error but don't block response
      logger.error('Error in logger middleware', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

export default loggerMiddleware;