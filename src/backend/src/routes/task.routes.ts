/**
 * @fileoverview Enterprise-grade task management routes with comprehensive security,
 * validation, monitoring, and rate limiting features.
 * @version 1.0.0
 */

// External imports with versions
import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v7.1.0
import cache from 'express-cache-middleware'; // v2.0.0
import helmet from 'helmet'; // v7.0.0

// Internal imports
import { TaskController } from '../controllers/task.controller';
import {
  authenticate,
  authorize,
  roleGuard
} from '../middleware/auth.middleware';
import {
  validationMiddleware,
  sanitizeMiddleware,
  validateRequestSchema
} from '../middleware/validator.middleware';
import {
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskQueryDTO
} from '../dto/task.dto';
import { UserRole } from '../types/user.types';
import { enhancedLogger as logger } from '../utils/logger.util';

// Rate limiting configurations
const readRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many read requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // 50 write requests per minute
  message: 'Too many write requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// Cache configuration
const cacheConfig = {
  duration: 300, // 5 minutes
  cacheHeader: 'x-cache',
  cacheNull: false,
  cacheKey: (req: any) => `${req.path}-${req.user?.id}`
};

/**
 * Configures and returns task management routes with enterprise-grade security
 * @returns Configured Express router instance
 */
const configureTaskRoutes = (): Router => {
  const router = Router();
  const taskController = new TaskController();

  // Apply security headers
  router.use(helmet());

  // Configure caching for GET routes
  const cacheMiddleware = cache(cacheConfig);

  // GET /tasks - Retrieve tasks with filtering and pagination
  router.get(
    '/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]),
    readRateLimiter,
    validationMiddleware(TaskQueryDTO),
    cacheMiddleware,
    taskController.getTasks
  );

  // GET /tasks/:id - Retrieve specific task
  router.get(
    '/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]),
    readRateLimiter,
    validateRequestSchema,
    cacheMiddleware,
    taskController.getTaskById
  );

  // POST /tasks - Create new task
  router.post(
    '/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD]),
    writeRateLimiter,
    sanitizeMiddleware,
    validationMiddleware(CreateTaskDTO),
    taskController.createTask
  );

  // PUT /tasks/:id - Update existing task
  router.put(
    '/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD]),
    writeRateLimiter,
    sanitizeMiddleware,
    validationMiddleware(UpdateTaskDTO),
    validateRequestSchema,
    taskController.updateTask
  );

  // DELETE /tasks/:id - Delete task (soft delete)
  router.delete(
    '/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
    writeRateLimiter,
    validateRequestSchema,
    taskController.deleteTask
  );

  // Error handling middleware
  router.use((err: any, req: any, res: any, next: any) => {
    logger.error('Task route error:', {
      error: err.message,
      path: req.path,
      method: req.method,
      correlationId: req.correlationId
    });

    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.errorCode || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred',
        correlationId: req.correlationId
      }
    });
  });

  return router;
};

// Export configured router
export const taskRouter = configureTaskRoutes();