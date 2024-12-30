/**
 * @fileoverview Centralized barrel file exporting all repository classes and interfaces
 * for the Task Management System's data access layer. Implements repository pattern
 * with proper type safety and data access abstraction.
 * @version 1.0.0
 */

// Import repository implementations and interfaces
import { AttachmentRepository } from './attachment.repository';
import { CommentRepository } from './comment.repository';
import { ProjectRepository } from './project.repository';
import { TaskRepository } from './task.repository';
import { UserRepository } from './user.repository';

/**
 * Base repository interface defining common data access methods
 * Implements repository pattern for consistent data access
 */
export interface IRepository<T, CreateDTO, UpdateDTO> {
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<T | null>;
}

// Export attachment repository and interface
export type { IAttachmentRepository } from './attachment.repository';
export { AttachmentRepository };

// Export comment repository and interface
export type { ICommentRepository } from './comment.repository';
export { CommentRepository };

// Export project repository and interface
export type { IProjectRepository } from './project.repository';
export { ProjectRepository };

// Export task repository and interface
export type { ITaskRepository } from './task.repository';
export { TaskRepository };

// Export user repository and interface
export type { IUserRepository } from './user.repository';
export { UserRepository };

/**
 * Default export of all repositories for convenient module imports
 */
export default {
  AttachmentRepository,
  CommentRepository,
  ProjectRepository,
  TaskRepository,
  UserRepository
};