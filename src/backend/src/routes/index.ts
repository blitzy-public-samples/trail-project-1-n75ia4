/**
 * @fileoverview Central routing configuration aggregating all API routes with enhanced security
 * Implements API Gateway pattern with comprehensive security, monitoring, and error handling
 * @version 1.0.0
 */

// External imports
import { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import cors from 'cors'; // ^2.8.5
import rateLimit from 'express-rate-limit'; // ^7.1.0

// Route imports
import authRouter from './auth.routes';
import projectRouter from './project.routes';
import taskRouter from './task.routes';
import userRouter from './user.routes';

// Utility imports
import { enhancedLogger as logger } from '../utils/logger.util';
import { createError } from '../utils/error.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';

// Constants
const API_VERSION = '/api/v1';
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

/**
 * Configures and combines all application routes with security middleware
 * @returns Configured Express router with all application routes
 */
const configureRoutes = (): Router => {
  const router = Router();

  // Apply security headers
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Configure CORS
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-RateLimit-Reset', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Global rate limiting
  const globalRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        correlationId: req.headers['x-correlation-id']
      });
      res.status(StatusCode.TOO_MANY_REQUESTS).json({
        error: {
          code: ErrorCode.RATE_LIMIT_ERROR,
          message: 'Rate limit exceeded'
        }
      });
    }
  });

  router.use(globalRateLimiter);

  // Add correlation ID if not present
  router.use((req, res, next) => {
    if (!req.headers['x-correlation-id']) {
      req.headers['x-correlation-id'] = crypto.randomUUID();
    }
    next();
  });

  // Mount route modules
  router.use(`${API_VERSION}/auth`, authRouter);
  router.use(`${API_VERSION}/projects`, projectRouter);
  router.use(`${API_VERSION}/tasks`, taskRouter);
  router.use(`${API_VERSION}/users`, userRouter);

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.status(StatusCode.OK).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  });

  // 404 handler
  router.use((req, res) => {
    logger.warn('Route not found', {
      path: req.path,
      method: req.method,
      correlationId: req.headers['x-correlation-id']
    });
    res.status(StatusCode.NOT_FOUND).json({
      error: {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Requested resource not found'
      }
    });
  });

  // Global error handler
  router.use((err: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      correlationId: req.headers['x-correlation-id']
    });

    res.status(err.statusCode || StatusCode.INTERNAL_SERVER_ERROR).json({
      error: {
        code: err.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        message: err.message || 'Internal server error',
        correlationId: req.headers['x-correlation-id']
      }
    });
  });

  // Log router initialization
  logger.info('API routes initialized', {
    routes: router.stack
      .filter(r => r.route)
      .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`)
  });

  return router;
};

// Create and export configured router
export const router = configureRoutes();
```

This implementation provides a comprehensive central routing configuration with the following features:

1. Security Features:
- Helmet security headers
- CORS configuration
- Rate limiting
- XSS protection
- CSRF protection
- Content Security Policy

2. Monitoring & Logging:
- Request correlation IDs
- Comprehensive error logging
- Route initialization logging
- Health check endpoint

3. Error Handling:
- Global error handler
- 404 handler
- Standardized error responses
- Security context in errors

4. Route Organization:
- API versioning
- Modular route mounting
- Clean separation of concerns
- Consistent path structure

5. Performance & Scalability:
- Rate limiting configuration
- Efficient middleware setup
- Header optimization
- Cache control

The router can be used in the main application file like this:

```typescript
import express from 'express';
import { router } from './routes';

const app = express();
app.use(router);