/**
 * @fileoverview Enhanced user controller implementation with security features and RBAC
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18+
import { injectable, inject } from 'inversify'; // v6.0+
import { 
  controller, 
  httpGet, 
  httpPost, 
  httpPut, 
  httpDelete, 
  authorize 
} from 'inversify-express-utils'; // v6.0+
import { rateLimit } from 'express-rate-limit'; // v7.0+
import { UserService } from '../services/user.service';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';
import { createError } from '../utils/error.util';
import { enhancedLogger as logger } from '../utils/logger.util';
import { 
  UserRole, 
  UserStatus, 
  CreateUserDTO, 
  UpdateUserDTO, 
  UserQueryParams, 
  UserPreferences 
} from '../types/user.types';

/**
 * Controller handling user management operations with enhanced security
 * Implements role-based access control and security monitoring
 */
@controller('/api/v1/users')
@injectable()
export class UserController {
  constructor(
    @inject('UserService') private readonly userService: UserService
  ) {}

  /**
   * Creates a new user with security validation
   * @secure Requires ADMIN role
   */
  @httpPost('/')
  @authorize(['ADMIN'])
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })
  async createUser(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.info('Creating new user', {
      correlationId,
      action: 'CREATE_USER',
      requestedBy: req.user?.id
    });

    try {
      const userData: CreateUserDTO = req.body;
      const user = await this.userService.create(userData);

      return res.status(StatusCode.CREATED).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'CREATE_USER', requestedBy: req.user?.id }
      );
    }
  }

  /**
   * Updates an existing user with security validation
   * @secure Requires ADMIN role or user updating their own data
   */
  @httpPut('/:id')
  @authorize(['ADMIN'])
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })
  async updateUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.info('Updating user', {
      correlationId,
      action: 'UPDATE_USER',
      userId: id,
      requestedBy: req.user?.id
    });

    try {
      // Check if user is updating their own data or is admin
      if (req.user?.id !== id && req.user?.role !== UserRole.ADMIN) {
        throw createError(
          'Insufficient permissions',
          StatusCode.FORBIDDEN,
          ErrorCode.AUTHORIZATION_ERROR,
          correlationId,
          { action: 'UPDATE_USER', userId: id, requestedBy: req.user?.id }
        );
      }

      const updateData: UpdateUserDTO = req.body;
      const user = await this.userService.update(id, updateData);

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'UPDATE_USER', userId: id, requestedBy: req.user?.id }
      );
    }
  }

  /**
   * Deletes a user with security validation
   * @secure Requires ADMIN role
   */
  @httpDelete('/:id')
  @authorize(['ADMIN'])
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })
  async deleteUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.info('Deleting user', {
      correlationId,
      action: 'DELETE_USER',
      userId: id,
      requestedBy: req.user?.id
    });

    try {
      await this.userService.delete(id);

      return res.status(StatusCode.NO_CONTENT).send();
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'DELETE_USER', userId: id, requestedBy: req.user?.id }
      );
    }
  }

  /**
   * Retrieves a user by ID with security validation
   * @secure Requires authentication
   */
  @httpGet('/:id')
  @authorize()
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
  async getUserById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.debug('Retrieving user by ID', {
      correlationId,
      action: 'GET_USER',
      userId: id,
      requestedBy: req.user?.id
    });

    try {
      const user = await this.userService.findById(id);

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'GET_USER', userId: id, requestedBy: req.user?.id }
      );
    }
  }

  /**
   * Retrieves a user by email with security validation
   * @secure Requires authentication
   */
  @httpGet('/email/:email')
  @authorize()
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 50 })
  async getUserByEmail(req: Request, res: Response): Promise<Response> {
    const { email } = req.params;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.debug('Retrieving user by email', {
      correlationId,
      action: 'GET_USER_BY_EMAIL',
      email,
      requestedBy: req.user?.id
    });

    try {
      const user = await this.userService.findByEmail(email);

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'GET_USER_BY_EMAIL', email, requestedBy: req.user?.id }
      );
    }
  }

  /**
   * Retrieves users based on query parameters with security validation
   * @secure Requires ADMIN or PROJECT_MANAGER role
   */
  @httpGet('/')
  @authorize(['ADMIN', 'PROJECT_MANAGER'])
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 50 })
  async getUsers(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const queryParams: UserQueryParams = req.query;

    logger.debug('Retrieving users with query', {
      correlationId,
      action: 'GET_USERS',
      query: queryParams,
      requestedBy: req.user?.id
    });

    try {
      const users = await this.userService.findAll(queryParams);

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: users
      });
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'GET_USERS', query: queryParams, requestedBy: req.user?.id }
      );
    }
  }

  /**
   * Updates user preferences with security validation
   * @secure Requires authentication and ownership
   */
  @httpPut('/:id/preferences')
  @authorize()
  @rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })
  async updateUserPreferences(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const correlationId = req.headers['x-correlation-id'] as string;
    const preferences: UserPreferences = req.body;

    logger.info('Updating user preferences', {
      correlationId,
      action: 'UPDATE_PREFERENCES',
      userId: id,
      requestedBy: req.user?.id
    });

    try {
      // Verify user is updating their own preferences
      if (req.user?.id !== id) {
        throw createError(
          'Cannot update preferences for other users',
          StatusCode.FORBIDDEN,
          ErrorCode.AUTHORIZATION_ERROR,
          correlationId,
          { action: 'UPDATE_PREFERENCES', userId: id, requestedBy: req.user?.id }
        );
      }

      const user = await this.userService.updatePreferences(id, preferences);

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      throw createError(
        error.message,
        error.statusCode || StatusCode.INTERNAL_SERVER_ERROR,
        error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        correlationId,
        { action: 'UPDATE_PREFERENCES', userId: id, requestedBy: req.user?.id }
      );
    }
  }
}