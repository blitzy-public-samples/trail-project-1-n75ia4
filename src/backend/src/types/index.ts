/**
 * @fileoverview Centralized barrel file for TypeScript type definitions
 * @version 1.0.0
 * @module types
 * 
 * This module serves as the central export point for all TypeScript type definitions,
 * interfaces, and enums used across the backend services. It implements a comprehensive
 * type system supporting authentication, project management, task tracking, and user
 * management features as specified in the technical requirements.
 */

// Authentication Types
export {
  AuthTokenType,
  AuthProvider,
  type TokenPayload,
  type AuthCredentials,
  type AuthTokens,
  type AuthSession,
  type MFAConfig,
  type AuthAttempt,
  type AuthError,
  type SSOConfig
} from './auth.types';

// Project Management Types
export {
  ProjectStatus,
  ProjectPriority,
  type Project,
  type CreateProjectDTO,
  type UpdateProjectDTO,
  type ProjectQueryParams
} from './project.types';

// Task Management Types
export {
  TaskStatus,
  TaskPriority,
  type Task,
  type TaskAttachment,
  type CreateTaskDTO,
  type UpdateTaskDTO,
  type TaskQueryParams,
  type TaskStats,
  type TaskEvent
} from './task.types';

// User Management Types
export {
  UserRole,
  UserStatus,
  type User,
  type UserPreferences,
  type NotificationPreferences,
  type CreateUserDTO,
  type UpdateUserDTO,
  type UserQueryParams
} from './user.types';

/**
 * Common type utilities and shared interfaces
 * These types are used across multiple modules
 */

// Pagination response interface
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Generic query parameters interface
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Generic response metadata interface
export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  version: string;
}

// Generic error response interface
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  metadata: ResponseMetadata;
}

// Audit log entry interface
export interface AuditLogEntry {
  id: string;
  entityType: 'user' | 'project' | 'task';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  userId: string;
  changes: Record<string, unknown>;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * Type guards for runtime type checking
 * These functions help validate types at runtime
 */

export const isUser = (obj: unknown): obj is User => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj
  );
};

export const isProject = (obj: unknown): obj is Project => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'status' in obj
  );
};

export const isTask = (obj: unknown): obj is Task => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'status' in obj
  );
};