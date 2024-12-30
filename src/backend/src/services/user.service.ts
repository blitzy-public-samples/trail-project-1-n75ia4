/**
 * @fileoverview Enhanced user service implementation with security monitoring and RBAC
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0+
import { IUserService, IUserRepository, IUser } from '../interfaces/user.interface';
import { 
  UserRole, 
  UserStatus, 
  CreateUserDTO, 
  UpdateUserDTO, 
  UserQueryParams,
  UserPreferences 
} from '../types/user.types';
import { createError } from '../utils/error.util';
import { enhancedLogger as logger } from '../utils/logger.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';

/**
 * Service implementation for user management operations with enhanced security monitoring
 */
@injectable()
export class UserService implements IUserService {
  constructor(
    @inject('IUserRepository') private readonly userRepository: IUserRepository
  ) {}

  /**
   * Creates a new user with security monitoring
   * @param data User creation data
   * @returns Promise resolving to created user
   */
  async create(data: CreateUserDTO): Promise<IUser> {
    logger.info('Creating new user', { email: data.email, role: data.role });

    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw createError(
          'User with this email already exists',
          StatusCode.CONFLICT,
          ErrorCode.RESOURCE_CONFLICT,
          undefined,
          { action: 'CREATE_USER', email: data.email }
        );
      }

      // Set default status and validate role
      const userData = {
        ...data,
        status: UserStatus.PENDING,
        preferences: data.preferences || this.getDefaultPreferences()
      };

      // Create user with security monitoring
      const user = await this.userRepository.create(userData);
      
      logger.security('User created successfully', {
        userId: user.id,
        action: 'CREATE_USER',
        role: user.role
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        error,
        email: data.email,
        role: data.role
      });
      throw error;
    }
  }

  /**
   * Updates an existing user with security validation
   * @param id User ID
   * @param data Update data
   * @returns Promise resolving to updated user
   */
  async update(id: string, data: UpdateUserDTO): Promise<IUser> {
    logger.info('Updating user', { userId: id });

    try {
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw createError(
          'User not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          undefined,
          { action: 'UPDATE_USER', userId: id }
        );
      }

      // Validate role update if present
      if (data.role && !this.isValidRoleUpdate(existingUser.role, data.role)) {
        throw createError(
          'Invalid role update',
          StatusCode.FORBIDDEN,
          ErrorCode.AUTHORIZATION_ERROR,
          undefined,
          { action: 'UPDATE_USER_ROLE', userId: id, currentRole: existingUser.role, newRole: data.role }
        );
      }

      const updatedUser = await this.userRepository.update(id, data);

      logger.security('User updated successfully', {
        userId: id,
        action: 'UPDATE_USER',
        changes: data
      });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user', { error, userId: id });
      throw error;
    }
  }

  /**
   * Deletes a user with security validation
   * @param id User ID
   */
  async delete(id: string): Promise<void> {
    logger.info('Deleting user', { userId: id });

    try {
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw createError(
          'User not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          undefined,
          { action: 'DELETE_USER', userId: id }
        );
      }

      await this.userRepository.delete(id);

      logger.security('User deleted successfully', {
        userId: id,
        action: 'DELETE_USER',
        role: existingUser.role
      });
    } catch (error) {
      logger.error('Failed to delete user', { error, userId: id });
      throw error;
    }
  }

  /**
   * Finds a user by ID with security monitoring
   * @param id User ID
   * @returns Promise resolving to found user
   */
  async findById(id: string): Promise<IUser> {
    logger.debug('Finding user by ID', { userId: id });

    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw createError(
          'User not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          undefined,
          { action: 'FIND_USER', userId: id }
        );
      }

      return user;
    } catch (error) {
      logger.error('Failed to find user by ID', { error, userId: id });
      throw error;
    }
  }

  /**
   * Finds a user by email with security monitoring
   * @param email User email
   * @returns Promise resolving to found user
   */
  async findByEmail(email: string): Promise<IUser> {
    logger.debug('Finding user by email', { email });

    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw createError(
          'User not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          undefined,
          { action: 'FIND_USER', email }
        );
      }

      return user;
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      throw error;
    }
  }

  /**
   * Finds all users matching query parameters
   * @param query Query parameters
   * @returns Promise resolving to array of users
   */
  async findAll(query: UserQueryParams): Promise<IUser[]> {
    logger.debug('Finding users with query', { query });

    try {
      return await this.userRepository.findAll(query);
    } catch (error) {
      logger.error('Failed to find users', { error, query });
      throw error;
    }
  }

  /**
   * Updates user preferences with security validation
   * @param id User ID
   * @param preferences New preferences
   * @returns Promise resolving to updated user
   */
  async updatePreferences(id: string, preferences: UserPreferences): Promise<IUser> {
    logger.info('Updating user preferences', { userId: id });

    try {
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw createError(
          'User not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          undefined,
          { action: 'UPDATE_PREFERENCES', userId: id }
        );
      }

      const updatedUser = await this.userRepository.update(id, { preferences });

      logger.security('User preferences updated', {
        userId: id,
        action: 'UPDATE_PREFERENCES'
      });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user preferences', { error, userId: id });
      throw error;
    }
  }

  /**
   * Updates user status with security validation
   * @param id User ID
   * @param status New status
   * @returns Promise resolving to updated user
   */
  async updateStatus(id: string, status: UserStatus): Promise<IUser> {
    logger.info('Updating user status', { userId: id, status });

    try {
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw createError(
          'User not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          undefined,
          { action: 'UPDATE_STATUS', userId: id }
        );
      }

      const updatedUser = await this.userRepository.update(id, { status });

      logger.security('User status updated', {
        userId: id,
        action: 'UPDATE_STATUS',
        oldStatus: existingUser.status,
        newStatus: status
      });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user status', { error, userId: id });
      throw error;
    }
  }

  /**
   * Validates role update based on role hierarchy
   * @param currentRole Current user role
   * @param newRole New role to assign
   * @returns boolean indicating if update is valid
   */
  private isValidRoleUpdate(currentRole: UserRole, newRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD, UserRole.TEAM_MEMBER, UserRole.GUEST],
      [UserRole.PROJECT_MANAGER]: [UserRole.TEAM_LEAD, UserRole.TEAM_MEMBER, UserRole.GUEST],
      [UserRole.TEAM_LEAD]: [UserRole.TEAM_MEMBER, UserRole.GUEST],
      [UserRole.TEAM_MEMBER]: [UserRole.GUEST],
      [UserRole.GUEST]: []
    };

    return roleHierarchy[currentRole].includes(newRole);
  }

  /**
   * Returns default user preferences
   * @returns Default UserPreferences object
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        inApp: true,
        taskUpdates: true,
        projectUpdates: true
      }
    };
  }
}