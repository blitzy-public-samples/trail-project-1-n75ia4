/**
 * @fileoverview Centralized barrel file that exports all Prisma-based model classes
 * for the task management system. Provides type-safe access to database models with
 * comprehensive documentation and proper encapsulation.
 * @version 1.0.0
 * @module models
 */

// Import all model classes
import { AttachmentModel } from './attachment.model';
import { Comment } from './comment.model';
import { ProjectModel } from './project.model';
import { TaskModel } from './task.model';
import { User } from './user.model';

/**
 * Export all model classes with their full type definitions and documentation
 * These models implement the core features and functionalities defined in the
 * technical specifications, including task management, project organization,
 * team collaboration, and file attachments.
 */

/**
 * Enhanced attachment model with comprehensive security and monitoring features
 * Implements secure file handling, virus scanning, and audit logging
 * @see AttachmentModel
 */
export { AttachmentModel };

/**
 * Enhanced comment model with real-time features and content moderation
 * Implements comment threading, mentions, and content sanitization
 * @see Comment
 */
export { Comment };

/**
 * Enhanced project model with advanced project management capabilities
 * Implements project hierarchy, timeline management, and team collaboration
 * @see ProjectModel
 */
export { ProjectModel };

/**
 * Enhanced task model with comprehensive task management features
 * Implements task tracking, priority management, and assignment capabilities
 * @see TaskModel
 */
export { TaskModel };

/**
 * Enhanced user model with security features and role-based access control
 * Implements user management, authentication, and authorization
 * @see User
 */
export { User };

/**
 * Default export providing access to all models
 * Useful for dependency injection and testing
 */
export default {
  AttachmentModel,
  Comment,
  ProjectModel,
  TaskModel,
  User
};