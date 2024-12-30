/**
 * @fileoverview Centralized barrel file exporting all service implementations
 * for dependency injection and modular service management in the task management system.
 * @version 1.0.0
 */

// Core service exports
export { AuthService } from './auth.service';
export { TaskService } from './task.service';
export { ProjectService } from './project.service';

// Infrastructure service exports
export { CacheService } from './cache.service';
export { EmailService } from './email.service';
export { QueueService } from './queue.service';
export { StorageService } from './storage.service';
export { WebSocketService } from './websocket.service';

// Service instance exports for singleton services
export { default as emailService } from './email.service';
export { default as queueService } from './queue.service';

/**
 * Service initialization and dependency injection configuration
 * Ensures proper service startup order and dependency management
 */
export const initializeServices = async (): Promise<void> => {
  try {
    // Initialize infrastructure services first
    await queueService.connect();
    await emailService.getInstance();

    // Log successful initialization
    console.info('All services initialized successfully');
  } catch (error) {
    console.error('Service initialization failed:', error);
    throw error;
  }
};

/**
 * Service shutdown handler for graceful cleanup
 * Ensures proper resource cleanup and connection termination
 */
export const shutdownServices = async (): Promise<void> => {
  try {
    // Shutdown order: application services first, then infrastructure
    await queueService.disconnect();
    await emailService.getInstance().disconnect();

    console.info('All services shut down successfully');
  } catch (error) {
    console.error('Service shutdown failed:', error);
    throw error;
  }
};

// Export service types for type safety
export type {
  IAuthService,
  ITokenService,
  ISessionService,
  IMFAService,
} from '../interfaces/auth.interface';

export type {
  ITaskService,
  ITask,
  ICreateTaskDTO,
  IUpdateTaskDTO,
  ITaskQueryParams,
} from '../interfaces/task.interface';

export type {
  IProjectService,
  IProject,
  ICreateProjectDTO,
  IUpdateProjectDTO,
  IProjectQueryParams,
} from '../interfaces/project.interface';