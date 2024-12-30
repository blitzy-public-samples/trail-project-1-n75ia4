/**
 * @fileoverview Core interfaces for user management in the task management system
 * @version 1.0.0
 * @module interfaces/user
 */

import {
  UserRole,
  UserStatus,
  UserPreferences,
  NotificationPreferences,
  CreateUserDTO,
  UpdateUserDTO,
  UserQueryParams
} from '../types/user.types';

/**
 * Core user entity interface defining the structure of a user in the system.
 * Implements data classification requirements for user data security.
 * @interface IUser
 */
export interface IUser {
  /** Unique identifier for the user */
  id: string;

  /** User's email address (unique identifier for authentication) */
  email: string;

  /** User's full name */
  name: string;

  /** User's role for role-based access control */
  role: UserRole;

  /** Current status of the user account */
  status: UserStatus;

  /** User's assigned department or business unit */
  department: string;

  /** User's customizable preferences */
  preferences: UserPreferences;

  /** Timestamp of user's last successful login */
  lastLoginAt: Date;

  /** Timestamp of user account creation */
  createdAt: Date;

  /** Timestamp of last user account update */
  updatedAt: Date;
}

/**
 * Service interface defining core user management operations.
 * Implements user management requirements from technical specifications.
 * @interface IUserService
 */
export interface IUserService {
  /**
   * Creates a new user in the system
   * @param data - User creation data transfer object
   * @returns Promise resolving to the created user
   */
  create(data: CreateUserDTO): Promise<IUser>;

  /**
   * Updates an existing user's information
   * @param id - Unique identifier of the user
   * @param data - User update data transfer object
   * @returns Promise resolving to the updated user
   */
  update(id: string, data: UpdateUserDTO): Promise<IUser>;

  /**
   * Deletes a user from the system
   * @param id - Unique identifier of the user
   * @returns Promise resolving when deletion is complete
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieves a user by their unique identifier
   * @param id - Unique identifier of the user
   * @returns Promise resolving to the found user
   */
  findById(id: string): Promise<IUser>;

  /**
   * Retrieves a user by their email address
   * @param email - Email address of the user
   * @returns Promise resolving to the found user
   */
  findByEmail(email: string): Promise<IUser>;

  /**
   * Retrieves all users matching the specified query parameters
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to an array of matching users
   */
  findAll(query: UserQueryParams): Promise<IUser[]>;

  /**
   * Updates a user's preferences
   * @param id - Unique identifier of the user
   * @param preferences - New user preferences
   * @returns Promise resolving to the updated user
   */
  updatePreferences(id: string, preferences: UserPreferences): Promise<IUser>;

  /**
   * Updates a user's account status
   * @param id - Unique identifier of the user
   * @param status - New account status
   * @returns Promise resolving to the updated user
   */
  updateStatus(id: string, status: UserStatus): Promise<IUser>;
}

/**
 * Repository interface for user data access operations.
 * Implements data access patterns for user management.
 * @interface IUserRepository
 */
export interface IUserRepository {
  /**
   * Creates a new user record in the data store
   * @param data - User creation data transfer object
   * @returns Promise resolving to the created user
   */
  create(data: CreateUserDTO): Promise<IUser>;

  /**
   * Updates an existing user record
   * @param id - Unique identifier of the user
   * @param data - User update data transfer object
   * @returns Promise resolving to the updated user
   */
  update(id: string, data: UpdateUserDTO): Promise<IUser>;

  /**
   * Deletes a user record from the data store
   * @param id - Unique identifier of the user
   * @returns Promise resolving when deletion is complete
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieves a user record by ID
   * @param id - Unique identifier of the user
   * @returns Promise resolving to the found user
   */
  findById(id: string): Promise<IUser>;

  /**
   * Retrieves a user record by email address
   * @param email - Email address of the user
   * @returns Promise resolving to the found user
   */
  findByEmail(email: string): Promise<IUser>;

  /**
   * Retrieves all user records matching the query parameters
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to an array of matching users
   */
  findAll(query: UserQueryParams): Promise<IUser[]>;
}