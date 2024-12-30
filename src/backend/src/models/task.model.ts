/**
 * @fileoverview Enterprise-grade task model implementation with advanced features
 * @version 1.0.0
 * @module models/task
 */

// External imports - v5.0+ for Prisma, v5.0+ for ioredis
import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { UUID, randomUUID } from 'crypto';

// Internal imports
import { 
  ITask, 
  ICreateTaskDTO, 
  IUpdateTaskDTO, 
  ITaskQueryParams,
  ITaskContext,
  ITaskPaginatedResponse,
  Result,
  TaskError 
} from '../interfaces/task.interface';
import { TaskStatus, TaskPriority } from '../types/task.types';

/**
 * Enhanced task model class implementing Prisma operations with advanced features
 */
export class TaskModel {
  private readonly CACHE_TTL = 3600; // 1 hour cache TTL
  private readonly CACHE_PREFIX = 'task:';
  private readonly LOCK_TTL = 30000; // 30 seconds lock TTL

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  /**
   * Creates a new task with audit trail and validation
   * @param data Task creation data
   * @param context Operation context
   * @returns Created task instance with audit information
   */
  async createTask(
    data: ICreateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>> {
    try {
      // Start transaction for atomic operation
      return await this.prisma.$transaction(async (tx) => {
        const taskId = randomUUID();
        
        // Validate project existence
        const projectExists = await tx.project.findUnique({
          where: { id: data.projectId }
        });
        
        if (!projectExists) {
          return {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Referenced project does not exist'
            }
          };
        }

        const task = await tx.task.create({
          data: {
            id: taskId,
            title: data.title,
            description: data.description || '',
            status: TaskStatus.TODO,
            priority: data.priority,
            assigneeId: data.assigneeId,
            projectId: data.projectId,
            dueDate: data.dueDate,
            metadata: data.metadata || {},
            tags: data.tags || [],
            attachmentIds: data.attachmentIds || [],
            version: 1,
            createdBy: context.userId,
            updatedBy: context.userId,
            isDeleted: false
          }
        });

        // Create audit log entry
        await tx.taskAuditLog.create({
          data: {
            taskId: task.id,
            action: 'CREATE',
            userId: context.userId,
            changes: task,
            metadata: {
              correlationId: context.correlationId,
              requestId: context.requestId
            }
          }
        });

        // Invalidate related caches
        await this.invalidateTaskCache(task.id);
        await this.invalidateListCache();

        // Track telemetry
        context.telemetry.metrics.taskCreationTime = Date.now() - context.telemetry.operationStart.getTime();

        return {
          success: true,
          data: task
        };
      });
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Updates task with optimistic locking and validation
   * @param id Task identifier
   * @param data Update data
   * @param context Operation context
   * @returns Updated task instance
   */
  async updateTask(
    id: UUID,
    data: IUpdateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>> {
    try {
      const lockKey = `${this.CACHE_PREFIX}lock:${id}`;
      
      // Acquire distributed lock
      const locked = await this.redis.set(
        lockKey,
        context.userId,
        'NX',
        'PX',
        this.LOCK_TTL
      );

      if (!locked) {
        return {
          success: false,
          error: {
            code: 'CONCURRENT_UPDATE',
            message: 'Task is currently being modified by another operation'
          }
        };
      }

      return await this.prisma.$transaction(async (tx) => {
        // Check version for optimistic locking
        const currentTask = await tx.task.findUnique({
          where: { id, isDeleted: false }
        });

        if (!currentTask) {
          return {
            success: false,
            error: {
              code: 'TASK_NOT_FOUND',
              message: 'Task not found or has been deleted'
            }
          };
        }

        if (currentTask.version !== data.version) {
          return {
            success: false,
            error: {
              code: 'VERSION_CONFLICT',
              message: 'Task has been modified by another operation'
            }
          };
        }

        const updatedTask = await tx.task.update({
          where: { id },
          data: {
            ...data,
            version: {
              increment: 1
            },
            updatedBy: context.userId,
            updatedAt: new Date()
          }
        });

        // Create audit log entry
        await tx.taskAuditLog.create({
          data: {
            taskId: id,
            action: 'UPDATE',
            userId: context.userId,
            changes: {
              previous: currentTask,
              current: updatedTask
            },
            metadata: {
              correlationId: context.correlationId,
              requestId: context.requestId
            }
          }
        });

        // Invalidate caches
        await this.invalidateTaskCache(id);
        await this.invalidateListCache();

        // Track telemetry
        context.telemetry.metrics.taskUpdateTime = Date.now() - context.telemetry.operationStart.getTime();

        return {
          success: true,
          data: updatedTask
        };
      });
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    } finally {
      // Release lock
      await this.redis.del(`${this.CACHE_PREFIX}lock:${id}`);
    }
  }

  /**
   * Retrieves tasks with enhanced filtering and caching
   * @param params Query parameters
   * @param context Operation context
   * @returns Paginated task results with metadata
   */
  async getTasks(
    params: ITaskQueryParams,
    context: ITaskContext
  ): Promise<Result<ITaskPaginatedResponse, TaskError>> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify(params)}`;
      
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: JSON.parse(cached)
        };
      }

      const where: Prisma.TaskWhereInput = {
        isDeleted: context.includeSoftDeleted ? undefined : false,
        status: params.status ? { in: params.status } : undefined,
        priority: params.priority ? { in: params.priority } : undefined,
        assigneeId: params.assigneeIds ? { in: params.assigneeIds } : undefined,
        projectId: params.projectIds ? { in: params.projectIds } : undefined,
        tags: params.tags ? { hasEvery: params.tags } : undefined,
        createdAt: {
          gte: params.dateRangeStart,
          lte: params.dateRangeEnd
        }
      };

      // Execute query with pagination
      const [items, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          skip: (params.page - 1) * params.limit,
          take: params.limit,
          orderBy: {
            [params.sortBy]: params.sortOrder
          }
        }),
        this.prisma.task.count({ where })
      ]);

      const response: ITaskPaginatedResponse = {
        items,
        total,
        page: params.page,
        limit: params.limit,
        hasMore: total > params.page * params.limit
      };

      // Cache results
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        this.CACHE_TTL
      );

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
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
    try {
      await this.prisma.$transaction(async (tx) => {
        const task = await tx.task.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedBy: context.userId,
            updatedAt: new Date()
          }
        });

        // Create audit log entry
        await tx.taskAuditLog.create({
          data: {
            taskId: id,
            action: 'DELETE',
            userId: context.userId,
            changes: task,
            metadata: {
              correlationId: context.correlationId,
              requestId: context.requestId
            }
          }
        });

        // Invalidate caches
        await this.invalidateTaskCache(id);
        await this.invalidateListCache();
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Helper method to invalidate task cache
   * @param taskId Task identifier
   */
  private async invalidateTaskCache(taskId: UUID): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}${taskId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Helper method to invalidate list cache
   */
  private async invalidateListCache(): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}list:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Helper method to handle and standardize errors
   * @param error Error instance
   * @returns Standardized task error
   */
  private handleError(error: unknown): TaskError {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        code: error.code,
        message: 'Database operation failed',
        details: error
      };
    }
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: error instanceof Error ? error : undefined
    };
  }
}

export default TaskModel;