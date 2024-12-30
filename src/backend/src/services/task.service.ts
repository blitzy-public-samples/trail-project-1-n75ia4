/**
 * @fileoverview Enterprise-grade task service implementation with comprehensive business logic
 * @version 1.0.0
 * @module services/task
 */

// External imports with versions
import { injectable, inject } from 'inversify'; // v6.0.1
import Redis from 'ioredis'; // v5.x
import CircuitBreaker from 'opossum'; // v6.x
import { Counter, Histogram } from 'prom-client'; // v14.x
import { Logger } from 'winston'; // v3.x
import { UUID } from 'crypto';

// Internal imports
import {
  ITask,
  ITaskService,
  ICreateTaskDTO,
  IUpdateTaskDTO,
  ITaskQueryParams,
  ITaskContext,
  TaskError,
  Result,
  ITaskPaginatedResponse
} from '../interfaces/task.interface';
import { TaskRepository } from '../repositories/task.repository';
import { TaskStatus, TaskPriority } from '../types/task.types';
import { WebSocketService } from '../services/websocket.service';
import { TYPES } from '../config/types';

// Constants
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000 // 30 seconds
};

const CACHE_TTL = {
  TASK: 3600, // 1 hour
  LIST: 300 // 5 minutes
};

/**
 * Enterprise-grade task service implementing comprehensive business logic
 * with enhanced security, performance optimization, and real-time updates
 */
@injectable()
export class TaskService implements ITaskService {
  // Metrics
  private readonly taskOperationHistogram: Histogram;
  private readonly taskErrorCounter: Counter;

  // Circuit breaker for external service calls
  private readonly notificationBreaker: CircuitBreaker;

  constructor(
    @inject(TYPES.TaskRepository) private readonly taskRepository: TaskRepository,
    @inject(TYPES.WebSocketService) private readonly webSocketService: WebSocketService,
    @inject(TYPES.RedisClient) private readonly redisClient: Redis,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.MetricsClient) private readonly metricsClient: any
  ) {
    // Initialize metrics
    this.taskOperationHistogram = new this.metricsClient.Histogram({
      name: 'task_operation_duration_seconds',
      help: 'Duration of task operations',
      labelNames: ['operation']
    });

    this.taskErrorCounter = new this.metricsClient.Counter({
      name: 'task_operation_errors_total',
      help: 'Total number of task operation errors',
      labelNames: ['operation', 'error_type']
    });

    // Initialize circuit breaker
    this.notificationBreaker = new CircuitBreaker(
      this.sendNotification.bind(this),
      CIRCUIT_BREAKER_OPTIONS
    );
  }

  /**
   * Creates a new task with enhanced validation and real-time updates
   * @param data Task creation data
   * @param context Operation context
   * @returns Created task or error
   */
  async createTask(
    data: ICreateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>> {
    const timer = this.taskOperationHistogram.startTimer({ operation: 'create' });

    try {
      this.logger.info('Creating new task', {
        correlationId: context.correlationId,
        data: { ...data, description: '...' } // Sanitize logs
      });

      // Validate input
      const validationError = this.validateTaskInput(data);
      if (validationError) {
        return validationError;
      }

      // Create task
      const result = await this.taskRepository.create(data, context);

      if (result.success && result.data) {
        // Cache the new task
        await this.cacheTask(result.data);

        // Send real-time update with circuit breaker
        await this.notificationBreaker.fire({
          type: 'TASK_CREATED',
          task: result.data,
          userId: context.userId
        });

        this.logger.info('Task created successfully', {
          correlationId: context.correlationId,
          taskId: result.data.id
        });
      }

      timer({ success: result.success ? 'true' : 'false' });
      return result;

    } catch (error) {
      this.handleOperationError('create', error, context);
      timer({ success: 'false' });
      throw error;
    }
  }

  /**
   * Updates an existing task with optimistic locking
   * @param id Task identifier
   * @param data Update data with version
   * @param context Operation context
   * @returns Updated task or error
   */
  async updateTask(
    id: UUID,
    data: IUpdateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>> {
    const timer = this.taskOperationHistogram.startTimer({ operation: 'update' });

    try {
      this.logger.info('Updating task', {
        correlationId: context.correlationId,
        taskId: id
      });

      // Validate update data
      const validationError = this.validateTaskUpdate(data);
      if (validationError) {
        return validationError;
      }

      // Update task with optimistic locking
      const result = await this.taskRepository.update(id, data, context);

      if (result.success && result.data) {
        // Update cache
        await this.cacheTask(result.data);

        // Send real-time update
        await this.notificationBreaker.fire({
          type: 'TASK_UPDATED',
          task: result.data,
          userId: context.userId
        });

        this.logger.info('Task updated successfully', {
          correlationId: context.correlationId,
          taskId: id
        });
      }

      timer({ success: result.success ? 'true' : 'false' });
      return result;

    } catch (error) {
      this.handleOperationError('update', error, context);
      timer({ success: 'false' });
      throw error;
    }
  }

  /**
   * Retrieves a task by ID with caching
   * @param id Task identifier
   * @param context Operation context
   * @returns Task instance or null if not found
   */
  async getTaskById(
    id: UUID,
    context: ITaskContext
  ): Promise<Result<ITask | null, TaskError>> {
    const timer = this.taskOperationHistogram.startTimer({ operation: 'get' });

    try {
      // Try cache first
      const cached = await this.redisClient.get(`task:${id}`);
      if (cached) {
        timer({ success: 'true', cached: 'hit' });
        return { success: true, data: JSON.parse(cached) };
      }

      // Get from repository
      const result = await this.taskRepository.findById(id, context);

      if (result.success && result.data) {
        await this.cacheTask(result.data);
      }

      timer({ success: result.success ? 'true' : 'false', cached: 'miss' });
      return result;

    } catch (error) {
      this.handleOperationError('get', error, context);
      timer({ success: 'false' });
      throw error;
    }
  }

  /**
   * Retrieves tasks with enhanced filtering and pagination
   * @param params Query parameters
   * @param context Operation context
   * @returns Paginated task results with metadata
   */
  async getTasks(
    params: ITaskQueryParams,
    context: ITaskContext
  ): Promise<Result<ITaskPaginatedResponse, TaskError>> {
    const timer = this.taskOperationHistogram.startTimer({ operation: 'list' });

    try {
      // Validate query parameters
      const validatedParams = this.validateQueryParams(params);
      
      // Get tasks with pagination
      const result = await this.taskRepository.findAll(validatedParams, context);

      timer({ success: result.success ? 'true' : 'false' });
      return result;

    } catch (error) {
      this.handleOperationError('list', error, context);
      timer({ success: 'false' });
      throw error;
    }
  }

  /**
   * Soft deletes a task by ID
   * @param id Task identifier
   * @param context Operation context
   * @returns Void result or error
   */
  async deleteTask(
    id: UUID,
    context: ITaskContext
  ): Promise<Result<void, TaskError>> {
    const timer = this.taskOperationHistogram.startTimer({ operation: 'delete' });

    try {
      const result = await this.taskRepository.delete(id, context);

      if (result.success) {
        // Remove from cache
        await this.redisClient.del(`task:${id}`);

        // Send real-time update
        await this.notificationBreaker.fire({
          type: 'TASK_DELETED',
          taskId: id,
          userId: context.userId
        });

        this.logger.info('Task deleted successfully', {
          correlationId: context.correlationId,
          taskId: id
        });
      }

      timer({ success: result.success ? 'true' : 'false' });
      return result;

    } catch (error) {
      this.handleOperationError('delete', error, context);
      timer({ success: 'false' });
      throw error;
    }
  }

  /**
   * Validates task input data
   * @private
   */
  private validateTaskInput(data: ICreateTaskDTO): Result<ITask, TaskError> | null {
    if (!data.title?.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task title is required'
        }
      };
    }

    if (!data.projectId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Project ID is required'
        }
      };
    }

    if (data.dueDate && new Date(data.dueDate) < new Date()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Due date cannot be in the past'
        }
      };
    }

    return null;
  }

  /**
   * Validates task update data
   * @private
   */
  private validateTaskUpdate(data: IUpdateTaskDTO): Result<ITask, TaskError> | null {
    if (data.title && !data.title.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task title cannot be empty'
        }
      };
    }

    if (data.dueDate && new Date(data.dueDate) < new Date()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Due date cannot be in the past'
        }
      };
    }

    return null;
  }

  /**
   * Validates and normalizes query parameters
   * @private
   */
  private validateQueryParams(params: ITaskQueryParams): ITaskQueryParams {
    return {
      ...params,
      page: Math.max(1, params.page || 1),
      limit: Math.min(100, Math.max(1, params.limit || 10)),
      sortOrder: params.sortOrder || 'desc'
    };
  }

  /**
   * Caches task data with TTL
   * @private
   */
  private async cacheTask(task: ITask): Promise<void> {
    await this.redisClient.setex(
      `task:${task.id}`,
      CACHE_TTL.TASK,
      JSON.stringify(task)
    );
  }

  /**
   * Sends notification through WebSocket service
   * @private
   */
  private async sendNotification(data: any): Promise<void> {
    await this.webSocketService.broadcast('task-updates', data);
  }

  /**
   * Handles and logs operation errors
   * @private
   */
  private handleOperationError(
    operation: string,
    error: any,
    context: ITaskContext
  ): void {
    this.taskErrorCounter.inc({
      operation,
      error_type: error.name || 'UnknownError'
    });

    this.logger.error(`Task operation error: ${operation}`, {
      correlationId: context.correlationId,
      error: error.message,
      stack: error.stack
    });
  }
}