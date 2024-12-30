/**
 * @fileoverview Central export point for all interfaces in the Task Management System
 * Provides a unified access point for core interfaces related to authentication,
 * projects, tasks, users, and configuration.
 * @version 1.0.0
 * @module interfaces
 */

// Authentication related interfaces
export {
  IAuthService,
  ITokenService,
  ISessionService
} from './auth.interface';

// Project management interfaces
export {
  IProject,
  IProjectService,
  ICreateProjectDTO,
  IUpdateProjectDTO,
  IProjectQueryParams
} from './project.interface';

// Task management interfaces
export {
  ITask,
  ITaskService,
  ICreateTaskDTO,
  IUpdateTaskDTO,
  ITaskQueryParams,
  ITaskContext,
  ITaskPaginatedResponse,
  ITaskTelemetry,
  Result,
  TaskError
} from './task.interface';

// User management interfaces
export {
  IUser,
  IUserService,
  IUserRepository
} from './user.interface';

// Configuration interfaces
export {
  AuthConfig,
  DatabaseConfig,
  CacheConfig,
  EmailConfig
} from './config.interface';

/**
 * @remarks
 * This file serves as the central hub for all interface exports in the Task Management System.
 * It implements a clean and organized approach to interface management, making it easier
 * for other modules to import required interfaces through a single entry point.
 * 
 * The exported interfaces cover the following major areas:
 * - Authentication and Authorization (auth.interface.ts)
 * - Project Management (project.interface.ts)
 * - Task Management (task.interface.ts)
 * - User Management (user.interface.ts)
 * - System Configuration (config.interface.ts)
 * 
 * Version compatibility:
 * - TypeScript: ^5.0.0
 * - Node.js: ^20.0.0
 * 
 * Security considerations:
 * - All interfaces follow strict type safety
 * - Sensitive configuration interfaces are properly encapsulated
 * - Access control is enforced through service interfaces
 */