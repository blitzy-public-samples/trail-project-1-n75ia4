/**
 * @fileoverview Express router configuration for user management endpoints
 * Implements secure routes with comprehensive RBAC and monitoring
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18+
import helmet from 'helmet'; // v7.0+

// Import controllers and middleware
import { UserController } from '../controllers/user.controller';
import {
  authenticate,
  authorize,
  createRateLimit
} from '../middleware/auth.middleware';
import {
  validationMiddleware,
  sanitizeMiddleware,
  validateRequestSchema
} from '../middleware/validator.middleware';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserQueryDTO
} from '../dto/user.dto';
import { enhancedLogger as logger } from '../utils/logger.util';
import { UserRole } from '../types/user.types';

/**
 * Initializes and configures user management routes with security features
 * @returns Configured Express router instance
 */
const initializeUserRoutes = (): Router => {
  const router = Router();
  const userController = new UserController();

  // Apply security headers
  router.use(helmet());

  // GET /api/v1/users
  // Get all users with filtering and pagination
  router.get('/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
    createRateLimit({
      [UserRole.ADMIN]: 1000,
      [UserRole.PROJECT_MANAGER]: 500
    }),
    validationMiddleware(UserQueryDTO),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.getUsers
  );

  // POST /api/v1/users
  // Create new user
  router.post('/',
    authenticate,
    authorize([UserRole.ADMIN]),
    createRateLimit({ [UserRole.ADMIN]: 100 }),
    validationMiddleware(CreateUserDTO),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.createUser
  );

  // GET /api/v1/users/:id
  // Get user by ID
  router.get('/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
    createRateLimit({
      [UserRole.ADMIN]: 1000,
      [UserRole.PROJECT_MANAGER]: 500
    }),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.getUserById
  );

  // GET /api/v1/users/email/:email
  // Get user by email
  router.get('/email/:email',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
    createRateLimit({
      [UserRole.ADMIN]: 1000,
      [UserRole.PROJECT_MANAGER]: 500
    }),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.getUserByEmail
  );

  // PUT /api/v1/users/:id
  // Update user
  router.put('/:id',
    authenticate,
    authorize([UserRole.ADMIN]),
    createRateLimit({ [UserRole.ADMIN]: 100 }),
    validationMiddleware(UpdateUserDTO),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.updateUser
  );

  // DELETE /api/v1/users/:id
  // Delete user
  router.delete('/:id',
    authenticate,
    authorize([UserRole.ADMIN]),
    createRateLimit({ [UserRole.ADMIN]: 50 }),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.deleteUser
  );

  // PUT /api/v1/users/:id/preferences
  // Update user preferences
  router.put('/:id/preferences',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]),
    createRateLimit({
      [UserRole.ADMIN]: 200,
      [UserRole.PROJECT_MANAGER]: 100,
      [UserRole.TEAM_MEMBER]: 50
    }),
    validateRequestSchema,
    sanitizeMiddleware,
    userController.updateUserPreferences
  );

  // Log router initialization
  logger.info('User routes initialized', {
    routes: router.stack.map(r => r.route?.path).filter(Boolean)
  });

  return router;
};

// Create and export configured router
const userRouter = initializeUserRoutes();
export default userRouter;