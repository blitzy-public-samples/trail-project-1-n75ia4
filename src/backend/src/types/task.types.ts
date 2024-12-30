/**
 * @fileoverview TypeScript type definitions for task-related entities and operations
 * @version 1.0.0
 * @module types/task
 */

// External imports
import { UUID } from 'crypto'; // v20.0.0+

// Internal imports
import { User } from './user.types';

/**
 * Enum defining possible task statuses
 * Maps to Kanban board columns in the UI
 */
export enum TaskStatus {
  TODO = 'TODO',           // New or backlog tasks
  IN_PROGRESS = 'IN_PROGRESS', // Tasks currently being worked on
  REVIEW = 'REVIEW',      // Tasks pending review/approval
  DONE = 'DONE'           // Completed tasks
}

/**
 * Enum defining task priority levels
 * Used for task prioritization and filtering
 */
export enum TaskPriority {
  HIGH = 'HIGH',       // Urgent/critical tasks
  MEDIUM = 'MEDIUM',   // Normal priority tasks
  LOW = 'LOW'         // Low priority/optional tasks
}

/**
 * Interface for task attachments
 * Represents files or documents associated with a task
 */
export interface TaskAttachment {
  id: UUID;           // Unique identifier for the attachment
  name: string;       // Original filename
  url: string;        // Storage URL for the attachment
  size?: number;      // File size in bytes
  mimeType?: string;  // File MIME type
}

/**
 * Core interface defining the complete structure of a task entity
 */
export interface Task {
  readonly id: UUID;                    // Unique identifier
  title: string;                        // Task title
  description: string | null;           // Optional task description
  status: TaskStatus;                   // Current task status
  priority: TaskPriority;               // Task priority level
  assigneeId: UUID | null;              // ID of assigned user (optional)
  projectId: UUID;                      // Associated project ID
  dueDate: Date | null;                 // Optional due date
  readonly createdAt: Date;             // Creation timestamp
  readonly updatedAt: Date;             // Last update timestamp
  attachments: TaskAttachment[];        // Associated files/documents
  metadata: Record<string, unknown>;    // Additional flexible metadata
}

/**
 * Data transfer object for task creation
 * Omits system-generated fields like id and timestamps
 */
export interface CreateTaskDTO {
  title: string;                        // Required task title
  description?: string | null;          // Optional description
  priority: TaskPriority;               // Required priority level
  assigneeId?: UUID | null;             // Optional assignee
  projectId: UUID;                      // Required project association
  dueDate?: Date | null;                // Optional due date
  attachments?: Array<{                 // Optional initial attachments
    name: string;
    content: Buffer;
  }>;
}

/**
 * Data transfer object for task updates
 * All fields are optional to support partial updates
 */
export interface UpdateTaskDTO {
  title?: string;                       // Optional title update
  description?: string | null;          // Optional description update
  status?: TaskStatus;                  // Optional status update
  priority?: TaskPriority;              // Optional priority update
  assigneeId?: UUID | null;             // Optional assignee update
  dueDate?: Date | null;                // Optional due date update
}

/**
 * Interface for task query parameters
 * Supports advanced filtering, pagination, and sorting
 */
export interface TaskQueryParams {
  status?: TaskStatus;                  // Filter by status
  priority?: TaskPriority;              // Filter by priority
  assigneeId?: UUID;                    // Filter by assignee
  projectId?: UUID;                     // Filter by project
  page: number;                         // Pagination page number
  limit: number;                        // Items per page
  sortBy: keyof Task;                   // Sort field
  sortOrder: 'asc' | 'desc';           // Sort direction
  search?: string;                      // Search in title/description
  dateRange?: {                         // Filter by date range
    start?: Date;
    end?: Date;
  };
}

/**
 * Interface for task statistics
 * Used for analytics and reporting
 */
export interface TaskStats {
  total: number;                        // Total tasks count
  byStatus: Record<TaskStatus, number>; // Tasks count by status
  byPriority: Record<TaskPriority, number>; // Tasks count by priority
  overdue: number;                      // Number of overdue tasks
  completedOnTime: number;              // Tasks completed within due date
}

/**
 * Type for task event notifications
 * Used in real-time updates and webhooks
 */
export type TaskEvent = {
  type: 'created' | 'updated' | 'deleted';
  taskId: UUID;
  changes?: Partial<Task>;
  timestamp: Date;
  triggeredBy: UUID;
};