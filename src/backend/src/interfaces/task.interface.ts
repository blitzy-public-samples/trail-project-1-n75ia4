/**
 * @fileoverview Enterprise-grade interfaces for task management system
 * @version 1.0.0
 * @module interfaces/task
 */

// External imports
import { UUID } from 'crypto'; // v20.0.0+

// Internal imports
import { TaskStatus, TaskPriority } from '../types/task.types';

/**
 * Result type for handling operation outcomes with proper error types
 */
export type Result<T, E> = Promise<{
  success: boolean;
  data?: T;
  error?: E;
}>;

/**
 * Enhanced error type for task operations
 */
export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Interface for task telemetry data
 */
export interface ITaskTelemetry {
  operationStart: Date;
  operationName: string;
  metrics: Record<string, number>;
  tags: Record<string, string>;
}

/**
 * Enhanced core interface defining the structure of a task entity
 */
export interface ITask {
  readonly id: UUID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: UUID;
  projectId: UUID;
  dueDate: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: UUID;
  readonly updatedBy: UUID;
  metadata: Record<string, unknown>;
  tags: string[];
  attachmentIds: UUID[];
  version: number; // For optimistic locking
}

/**
 * Interface for task creation data transfer object
 */
export interface ICreateTaskDTO {
  title: string;
  description?: string;
  priority: TaskPriority;
  assigneeId?: UUID;
  projectId: UUID;
  dueDate?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
  attachmentIds?: UUID[];
}

/**
 * Interface for task update data transfer object
 */
export interface IUpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: UUID;
  dueDate?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
  attachmentIds?: UUID[];
  version: number; // Required for optimistic locking
}

/**
 * Context interface for task operations with telemetry
 */
export interface ITaskContext {
  userId: UUID;
  correlationId: string;
  requestId: string;
  includeSoftDeleted: boolean;
  telemetry: ITaskTelemetry;
}

/**
 * Enhanced interface for task query parameters
 */
export interface ITaskQueryParams {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeIds?: UUID[];
  projectIds?: UUID[];
  page: number;
  limit: number;
  sortBy: keyof ITask;
  sortOrder: 'asc' | 'desc';
  searchTerm?: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  tags?: string[];
  includeMetadata?: boolean;
  includeDeleted?: boolean;
}

/**
 * Interface for paginated task response
 */
export interface ITaskPaginatedResponse {
  items: ITask[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  metadata?: {
    filterCounts: Record<string, number>;
    dateRangeStats: {
      earliest: Date;
      latest: Date;
      count: number;
    };
  };
}

/**
 * Enhanced interface defining task service operations contract
 */
export interface ITaskService {
  /**
   * Creates a new task with validation
   * @param data Task creation data
   * @param context Operation context
   * @returns Created task or error
   */
  createTask(
    data: ICreateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>>;

  /**
   * Updates an existing task with optimistic locking
   * @param id Task identifier
   * @param data Update data with version
   * @param context Operation context
   * @returns Updated task or error
   */
  updateTask(
    id: UUID,
    data: IUpdateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>>;

  /**
   * Soft deletes a task by ID
   * @param id Task identifier
   * @param context Operation context
   * @returns Void result or error
   */
  deleteTask(
    id: UUID,
    context: ITaskContext
  ): Promise<Result<void, TaskError>>;

  /**
   * Retrieves a task by ID with caching
   * @param id Task identifier
   * @param context Operation context
   * @returns Task instance or null if not found
   */
  getTaskById(
    id: UUID,
    context: ITaskContext
  ): Promise<Result<ITask | null, TaskError>>;

  /**
   * Retrieves tasks with enhanced filtering and pagination
   * @param params Query parameters
   * @param context Operation context
   * @returns Paginated task results with metadata
   */
  getTasks(
    params: ITaskQueryParams,
    context: ITaskContext
  ): Promise<Result<ITaskPaginatedResponse, TaskError>>;
}