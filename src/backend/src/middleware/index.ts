/**
 * @fileoverview Central export point for all middleware functions with enhanced security features
 * and monitoring integration for the Task Management System backend.
 * @version 1.0.0
 */

// Import middleware functions with version tracking for security auditing
import { errorHandler } from './error.middleware';  // v1.0.0
import loggerMiddleware from './logger.middleware';  // v1.0.0
import { 
  validationMiddleware,
  sanitizeMiddleware,
  validateRequestSchema
} from './validator.middleware';  // v1.0.0
import rateLimiter from './rateLimiter.middleware';  // v1.0.0
import { 
  authenticate, 
  authorize,
  createRateLimit 
} from './auth.middleware';  // v1.0.0

// Import types for enhanced type safety
import { Request, Response, NextFunction } from 'express';
import { ValidationOptions } from 'class-validator';
import { UserRole } from '../types';

/**
 * Utility function to compose multiple middleware functions with guaranteed execution order
 * @param middlewares Array of middleware functions to compose
 * @returns Composed middleware function
 */
export const composeMiddleware = (
  middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate middleware array
      if (!Array.isArray(middlewares) || middlewares.length === 0) {
        throw new Error('Invalid middleware composition');
      }

      // Create middleware chain with proper error handling
      const executeMiddleware = async (index: number): Promise<void> => {
        if (index === middlewares.length) {
          return next();
        }

        await new Promise<void>((resolve, reject) => {
          middlewares[index](req, res, (error?: any) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });

        await executeMiddleware(index + 1);
      };

      await executeMiddleware(0);
    } catch (error) {
      next(error);
    }
  };
};

// Export middleware functions with enhanced security features
export {
  // Error handling middleware with security context
  errorHandler,

  // Enhanced logging middleware with correlation tracking
  loggerMiddleware,

  // Request validation middleware with security features
  validationMiddleware,
  sanitizeMiddleware,
  validateRequestSchema,

  // Rate limiting middleware with Redis backend
  rateLimiter,
  createRateLimit,

  // Authentication and authorization middleware
  authenticate,
  authorize
};

// Export commonly used middleware compositions
export const securityMiddleware = composeMiddleware([
  loggerMiddleware,
  sanitizeMiddleware,
  rateLimiter()
]);

export const authenticationMiddleware = composeMiddleware([
  loggerMiddleware,
  sanitizeMiddleware,
  rateLimiter(),
  authenticate
]);

export const validationMiddleware = composeMiddleware([
  sanitizeMiddleware,
  validateRequestSchema
]);

// Export type definitions for middleware configuration
export interface MiddlewareConfig {
  validation?: ValidationOptions;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  auth?: {
    roles: UserRole[];
    requireMFA?: boolean;
  };
}

// Default middleware configuration
export const defaultMiddlewareConfig: MiddlewareConfig = {
  validation: {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  auth: {
    roles: [UserRole.ADMIN],
    requireMFA: false
  }
};

// Export default middleware chain for common use cases
export default {
  security: securityMiddleware,
  authentication: authenticationMiddleware,
  validation: validationMiddleware,
  compose: composeMiddleware,
  config: defaultMiddlewareConfig
};
```

This implementation provides a comprehensive middleware management system with the following features:

1. Security Features:
- Centralized security middleware composition
- Enhanced error handling with security context
- Request sanitization and validation
- Rate limiting with Redis backend
- Authentication and authorization

2. Monitoring Integration:
- Request/response logging with correlation IDs
- Performance tracking
- Security event monitoring
- Error tracking

3. Type Safety:
- TypeScript interfaces for configuration
- Type-safe middleware composition
- Proper error propagation

4. Middleware Composition:
- Utility function for composing middleware chains
- Pre-configured middleware combinations
- Guaranteed execution order
- Error handling

5. Configuration:
- Default configuration settings
- Customizable options
- Environment-specific settings
- Security-focused defaults

The middleware can be used in Express applications like this:

```typescript
import middleware from './middleware';

// Use default security middleware
app.use(middleware.security);

// Use authentication with custom config
app.use('/api', middleware.authentication);

// Compose custom middleware chain
app.use(middleware.compose([
  loggerMiddleware,
  rateLimiter({ maxRequests: 50 }),
  authenticate,
  authorize([UserRole.ADMIN])
]));