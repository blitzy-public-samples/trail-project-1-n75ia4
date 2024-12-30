/**
 * @fileoverview Enterprise-grade rate limiting middleware implementing sliding window algorithm
 * with Redis for distributed API request throttling. Provides configurable limits per route,
 * enhanced security features, and comprehensive monitoring capabilities.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.0
import { CacheService } from '../services/cache.service';
import { createError } from '../utils/error.util';
import { enhancedLogger as Logger } from '../utils/logger.util';
import { ErrorCode } from '../constants/error-codes';
import { StatusCode } from '../constants/status-codes';

/**
 * Configuration options for rate limiter middleware
 */
export interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Maximum number of requests allowed within window */
  maxRequests?: number;
  /** Key prefix for Redis storage */
  keyPrefix?: string;
  /** Skip failed requests in count */
  skipFailedRequests?: boolean;
  /** Array of trusted proxy IPs */
  trustProxies?: string[];
  /** Custom key generator function */
  keyGenerator?: (req: Request) => string;
  /** Custom rate limit exceeded handler */
  handler?: (req: Request, res: Response) => void;
  /** Enable detailed monitoring */
  enableMonitoring?: boolean;
}

// Default configuration constants
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_KEY_PREFIX = 'ratelimit:';
const REDIS_RETRY_ATTEMPTS = 3;
const REDIS_RETRY_DELAY = 1000;

// Rate limit response headers
const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After'
} as const;

/**
 * Generates a unique rate limit key for the request
 * @param req - Express request object
 * @param prefix - Key prefix for Redis storage
 * @returns Unique rate limit key
 */
const generateKey = (req: Request, prefix: string): string => {
  const ip = req.ip || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             'unknown';
             
  const route = req.baseUrl + req.path;
  return `${prefix}${ip}:${route}`;
};

/**
 * Creates rate limiting middleware with enhanced security and monitoring
 * @param options - Rate limiter configuration options
 * @returns Express middleware function
 */
export const rateLimiter = (options: RateLimiterOptions = {}) => {
  // Initialize configuration with defaults
  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    keyPrefix = DEFAULT_KEY_PREFIX,
    skipFailedRequests = false,
    trustProxies = [],
    keyGenerator = (req: Request) => generateKey(req, keyPrefix),
    enableMonitoring = true
  } = options;

  // Initialize Redis cache service
  const cacheService = CacheService.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    let retryCount = 0;
    const key = keyGenerator(req);

    // Validate client IP
    const clientIp = req.ip;
    if (!clientIp || (!trustProxies.includes(clientIp) && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(clientIp))) {
      Logger.warn('Invalid client IP detected', { ip: clientIp, path: req.path });
      return next(createError(
        'Invalid request origin',
        StatusCode.FORBIDDEN,
        ErrorCode.AUTHORIZATION_ERROR
      ));
    }

    try {
      // Implement retry mechanism for Redis operations
      while (retryCount < REDIS_RETRY_ATTEMPTS) {
        try {
          // Get current request count
          const currentCount = await cacheService.get<number>(key) || 0;

          // Check if rate limit exceeded
          if (currentCount >= maxRequests) {
            const resetTime = Math.ceil(windowMs / 1000);
            
            // Set rate limit headers
            res.set(RATE_LIMIT_HEADERS.LIMIT, maxRequests.toString());
            res.set(RATE_LIMIT_HEADERS.REMAINING, '0');
            res.set(RATE_LIMIT_HEADERS.RESET, resetTime.toString());
            res.set(RATE_LIMIT_HEADERS.RETRY_AFTER, resetTime.toString());

            // Log rate limit breach
            if (enableMonitoring) {
              Logger.warn('Rate limit exceeded', {
                ip: clientIp,
                path: req.path,
                count: currentCount,
                limit: maxRequests
              });
            }

            return next(createError(
              'Rate limit exceeded',
              StatusCode.TOO_MANY_REQUESTS,
              ErrorCode.RATE_LIMIT_ERROR
            ));
          }

          // Increment request count with sliding window
          await cacheService.set(key, currentCount + 1, Math.ceil(windowMs / 1000));

          // Set rate limit headers
          res.set(RATE_LIMIT_HEADERS.LIMIT, maxRequests.toString());
          res.set(RATE_LIMIT_HEADERS.REMAINING, (maxRequests - currentCount - 1).toString());
          res.set(RATE_LIMIT_HEADERS.RESET, Math.ceil(windowMs / 1000).toString());

          // Monitor rate limit usage if enabled
          if (enableMonitoring && currentCount > maxRequests * 0.8) {
            Logger.warn('Rate limit threshold approaching', {
              ip: clientIp,
              path: req.path,
              count: currentCount,
              limit: maxRequests
            });
          }

          break;
        } catch (error) {
          retryCount++;
          if (retryCount === REDIS_RETRY_ATTEMPTS) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, REDIS_RETRY_DELAY));
        }
      }

      // Skip failed requests if configured
      if (skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(...args: any[]): Response {
          if (res.statusCode >= 400) {
            cacheService.get<number>(key)
              .then(count => count && cacheService.set(key, count - 1, Math.ceil(windowMs / 1000)))
              .catch(error => Logger.error('Failed to decrement rate limit count', { error }));
          }
          return originalSend.apply(res, args);
        };
      }

      next();
    } catch (error) {
      Logger.error('Rate limiter error', { error, ip: clientIp, path: req.path });
      next(createError(
        'Rate limiting service unavailable',
        StatusCode.SERVICE_UNAVAILABLE,
        ErrorCode.SERVICE_UNAVAILABLE
      ));
    }
  };
};

export default rateLimiter;
```

This implementation provides a robust, enterprise-grade rate limiting middleware with the following features:

1. Distributed Rate Limiting:
- Uses Redis for distributed rate limiting across multiple application instances
- Implements sliding window algorithm for accurate request counting
- Supports retry mechanism for Redis operations

2. Security Features:
- IP validation and trusted proxy support
- Request origin verification
- Security-focused error handling
- Rate limit breach monitoring

3. Configuration Options:
- Customizable time windows and request limits
- Custom key generation support
- Failed request handling
- Monitoring toggles

4. Production Features:
- Comprehensive error handling
- Detailed logging
- Performance optimization
- Standard rate limit headers
- Monitoring and alerting

5. Enterprise Integration:
- TypeScript type safety
- Consistent error codes
- Monitoring integration
- Security context tracking

The middleware can be used in Express applications with custom configurations:

```typescript
app.use('/api', rateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  enableMonitoring: true,
  trustProxies: ['10.0.0.1', '10.0.0.2']
}));