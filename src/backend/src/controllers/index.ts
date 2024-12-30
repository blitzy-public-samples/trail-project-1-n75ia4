/**
 * @fileoverview Central export file for all controllers in the Task Management System
 * Implements strict type checking, comprehensive documentation, and circular dependency prevention
 * @version 1.0.0
 */

// Import controllers with version comments for dependency tracking
import { AuthController } from './auth.controller';  // v1.0.0
import { ProjectController } from './project.controller';  // v1.0.0
import { TaskController } from './task.controller';  // v1.0.0
import { UserController } from './user.controller';  // v1.0.0

/**
 * Export all controllers with their security and rate limit configurations
 * AuthController:
 * - Public endpoints: login, register
 * - Protected endpoints: refreshToken, logout
 * - Rate limits: 10/min for auth operations
 */
export { AuthController };

/**
 * ProjectController:
 * - Protected endpoints with role-based access
 * - Admin/Project Manager access required for create/update/delete
 * - Rate limits: 50-100/min based on operation
 */
export { ProjectController };

/**
 * TaskController:
 * - Protected endpoints with role-based access
 * - Rate limits: 100-200/min based on operation
 * - Caching enabled for read operations
 */
export { TaskController };

/**
 * UserController:
 * - Protected endpoints with strict role-based access
 * - Admin-only operations for user management
 * - Rate limits: 10-100/min based on operation sensitivity
 */
export { UserController };

/**
 * Controller registry for dependency injection configuration
 * Maps controller types to their implementations
 */
export const Controllers = {
  AuthController,
  ProjectController,
  TaskController,
  UserController
} as const;

/**
 * Type definitions for controller configuration
 * Used for type-safe dependency injection and routing
 */
export type ControllerTypes = keyof typeof Controllers;

/**
 * Controller instance type mapping
 * Provides type safety for controller instantiation
 */
export type ControllerInstances = {
  [K in ControllerTypes]: InstanceType<typeof Controllers[K]>;
};

// Default export for module
export default Controllers;