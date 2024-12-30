/**
 * @fileoverview TypeScript type definitions for task-related data structures, interfaces,
 * and enums used throughout the frontend application. Implements comprehensive task
 * management capabilities with enhanced validation, security, and analytics features.
 * @version 1.0.0
 */

import { ApiResponse, PaginatedResponse, QueryParams } from './api.types';
// @ts-ignore - UUID type from crypto module
import { UUID } from 'crypto'; // v20.0.0+

/**
 * Enumeration of possible task statuses.
 * Ensures type safety and standardization across the application.
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

/**
 * Enumeration of task priority levels.
 * Provides standardized priority classification.
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Comprehensive interface defining the structure of a task entity.
 * Implements enhanced security features and extensibility.
 */
export interface Task {
  /** Unique identifier for the task */
  readonly id: UUID;
  
  /** Task title with length constraints */
  title: string;
  
  /** Detailed task description */
  description: string;
  
  /** Current task status */
  status: TaskStatus;
  
  /** Task priority level */
  priority: TaskPriority;
  
  /** ID of the assigned user */
  assigneeId: UUID;
  
  /** ID of the associated project */
  projectId: UUID;
  
  /** Task due date */
  dueDate: Date;
  
  /** Array of attachment URLs or identifiers */
  attachments: string[];
  
  /** Array of task tags for categorization */
  tags: string[];
  
  /** Additional metadata for extensibility */
  metadata: Record<string, unknown>;
  
  /** Task creation timestamp */
  readonly createdAt: Date;
  
  /** Last update timestamp */
  readonly updatedAt: Date;
}

/**
 * Interface for task-related statistics and metrics.
 * Supports analytics and reporting features.
 */
export interface TaskStats {
  /** Total number of tasks */
  totalTasks: number;
  
  /** Number of completed tasks */
  completedTasks: number;
  
  /** Average time to task completion in milliseconds */
  averageCompletionTime: number;
  
  /** Distribution of tasks across different statuses */
  statusDistribution: Record<TaskStatus, number>;
}

/**
 * Interface for tracking task history and changes over time.
 * Implements audit trail capabilities.
 */
export interface TaskTimeline {
  /** Associated task ID */
  taskId: UUID;
  
  /** History of status changes with timestamps */
  statusChanges: Array<{
    status: TaskStatus;
    timestamp: Date;
  }>;
  
  /** History of assignee changes with timestamps */
  assigneeChanges: Array<{
    assigneeId: UUID;
    timestamp: Date;
  }>;
}

/**
 * Enhanced query parameters interface for task filtering and pagination.
 * Extends base QueryParams with task-specific filters.
 */
export interface TaskQueryParams extends QueryParams {
  /** Filter by task status */
  status?: TaskStatus;
  
  /** Filter by priority level */
  priority?: TaskPriority;
  
  /** Filter by assigned user */
  assigneeId?: UUID;
  
  /** Filter by project */
  projectId?: UUID;
  
  /** Filter by due date */
  dueDate?: Date;
  
  /** Sort field */
  sortBy?: keyof Task;
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Type alias for paginated task response
 */
export type PaginatedTaskResponse = PaginatedResponse<Task>;

/**
 * Type alias for task API response
 */
export type TaskApiResponse = ApiResponse<Task>;

/**
 * Type alias for task stats API response
 */
export type TaskStatsApiResponse = ApiResponse<TaskStats>;

/**
 * Type alias for task timeline API response
 */
export type TaskTimelineApiResponse = ApiResponse<TaskTimeline>;