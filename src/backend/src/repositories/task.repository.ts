/**
 * @fileoverview Enterprise-grade task repository implementation with comprehensive data access operations
 * @version 1.0.0
 * @module repositories/task
 */

import { PrismaClient, Prisma } from '@prisma/client'; // v5.0+
import Redis from 'ioredis'; // v5.0+
import { UUID } from 'crypto';
import { Result } from '@shared/utils'; // v1.0+

// Internal imports
import {
  ITask,
  ICreateTaskDTO,
  IUpdateTaskDTO,
  ITaskQueryParams,
  ITaskContext,
  TaskError,
  ITaskPaginatedResponse
} from '../interfaces/task.interface';
import { TaskStatus, TaskPriority } from '../types/task.types';

// Cache key patterns
const CACHE_KEYS = {
  TASK_BY_ID: (id: UUID) => `task:${id}`,
  TASK_LIST: (params: string) => `tasks:list:${params}`,
  TASK_COUNT: 'tasks:count'
};

// Cache TTL in seconds
const CACHE_TTL = {
  TASK_BY_ID: 3600, // 1 hour
  TASK_LIST: 300,   // 5 minutes
  TASK_COUNT: 300   // 5 minutes
};

/**
 * Enterprise-grade repository implementing comprehensive data access operations for tasks
 * with audit, versioning, caching, and telemetry support
 */
export class TaskRepository {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly queryTimeout: number;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    config: { queryTimeout: number }
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.queryTimeout = config.queryTimeout;
  }

  /**
   * Creates a new task with audit trail and metadata
   * @param data Task creation data
   * @param context Operation context
   * @returns Created task instance wrapped in Result
   */
  async create(
    data: ICreateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>> {
    try {
      const startTime = Date.now();

      // Validate required fields
      if (!data.title || !data.projectId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title and projectId are required'
          }
        };
      }

      // Create task with audit trail
      const task = await this.prisma.task.create({
        data: {
          id: crypto.randomUUID(),
          title: data.title,
          description: data.description || '',
          status: TaskStatus.TODO,
          priority: data.priority,
          projectId: data.projectId,
          assigneeId: data.assigneeId,
          dueDate: data.dueDate,
          metadata: data.metadata || {},
          tags: data.tags || [],
          attachmentIds: data.attachmentIds || [],
          version: 1,
          createdBy: context.userId,
          updatedBy: context.userId
        }
      });

      // Invalidate relevant caches
      await this.redis.del(CACHE_KEYS.TASK_COUNT);
      await this.invalidateListCache();

      // Log telemetry
      context.telemetry.metrics.createDuration = Date.now() - startTime;
      context.telemetry.tags.taskId = task.id;

      return { success: true, data: task };
    } catch (error) {
      // Handle specific database errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create task',
            details: { prismaError: error.code }
          }
        };
      }
      throw error;
    }
  }

  /**
   * Updates task with optimistic locking and audit trail
   * @param id Task identifier
   * @param data Update data with version
   * @param context Operation context
   * @returns Updated task instance wrapped in Result
   */
  async update(
    id: UUID,
    data: IUpdateTaskDTO,
    context: ITaskContext
  ): Promise<Result<ITask, TaskError>> {
    try {
      const startTime = Date.now();

      // Optimistic locking
      const task = await this.prisma.task.findUnique({ where: { id } });
      if (!task) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        };
      }

      if (task.version !== data.version) {
        return {
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'Task has been modified by another user'
          }
        };
      }

      // Update task with audit trail
      const updatedTask = await this.prisma.task.update({
        where: { id, version: data.version },
        data: {
          ...data,
          version: { increment: 1 },
          updatedBy: context.userId,
          updatedAt: new Date()
        }
      });

      // Invalidate caches
      await this.redis.del(CACHE_KEYS.TASK_BY_ID(id));
      await this.invalidateListCache();

      // Log telemetry
      context.telemetry.metrics.updateDuration = Date.now() - startTime;
      context.telemetry.tags.taskId = id;

      return { success: true, data: updatedTask };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update task',
            details: { prismaError: error.code }
          }
        };
      }
      throw error;
    }
  }

  /**
   * Retrieves a task by ID with caching
   * @param id Task identifier
   * @param context Operation context
   * @returns Task instance or null if not found
   */
  async findById(
    id: UUID,
    context: ITaskContext
  ): Promise<Result<ITask | null, TaskError>> {
    try {
      const startTime = Date.now();
      const cacheKey = CACHE_KEYS.TASK_BY_ID(id);

      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        context.telemetry.tags.cacheHit = 'true';
        return { success: true, data: JSON.parse(cached) };
      }

      // Fetch from database
      const task = await this.prisma.task.findUnique({
        where: { 
          id,
          deletedAt: context.includeSoftDeleted ? undefined : null
        }
      });

      if (task) {
        // Cache the result
        await this.redis.setex(
          cacheKey,
          CACHE_TTL.TASK_BY_ID,
          JSON.stringify(task)
        );
      }

      // Log telemetry
      context.telemetry.metrics.findByIdDuration = Date.now() - startTime;
      context.telemetry.tags.taskId = id;

      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve task',
          details: { error }
        }
      };
    }
  }

  /**
   * Retrieves tasks with enhanced filtering and pagination
   * @param params Query parameters
   * @param context Operation context
   * @returns Paginated task results with metadata
   */
  async findAll(
    params: ITaskQueryParams,
    context: ITaskContext
  ): Promise<Result<ITaskPaginatedResponse, TaskError>> {
    try {
      const startTime = Date.now();
      const cacheKey = CACHE_KEYS.TASK_LIST(JSON.stringify(params));

      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        context.telemetry.tags.cacheHit = 'true';
        return { success: true, data: JSON.parse(cached) };
      }

      // Build query
      const where: Prisma.TaskWhereInput = {
        deletedAt: context.includeSoftDeleted ? undefined : null,
        status: params.status ? { in: params.status } : undefined,
        priority: params.priority ? { in: params.priority } : undefined,
        assigneeId: params.assigneeIds ? { in: params.assigneeIds } : undefined,
        projectId: params.projectIds ? { in: params.projectIds } : undefined,
        tags: params.tags ? { hasEvery: params.tags } : undefined,
        OR: params.searchTerm ? [
          { title: { contains: params.searchTerm, mode: 'insensitive' } },
          { description: { contains: params.searchTerm, mode: 'insensitive' } }
        ] : undefined
      };

      // Execute query with pagination
      const [items, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          skip: (params.page - 1) * params.limit,
          take: params.limit,
          orderBy: { [params.sortBy]: params.sortOrder }
        }),
        this.prisma.task.count({ where })
      ]);

      const result: ITaskPaginatedResponse = {
        items,
        total,
        page: params.page,
        limit: params.limit,
        hasMore: total > params.page * params.limit
      };

      // Cache results
      await this.redis.setex(
        cacheKey,
        CACHE_TTL.TASK_LIST,
        JSON.stringify(result)
      );

      // Log telemetry
      context.telemetry.metrics.findAllDuration = Date.now() - startTime;
      context.telemetry.metrics.resultCount = items.length;

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve tasks',
          details: { error }
        }
      };
    }
  }

  /**
   * Soft deletes a task by ID
   * @param id Task identifier
   * @param context Operation context
   * @returns Void result or error
   */
  async delete(
    id: UUID,
    context: ITaskContext
  ): Promise<Result<void, TaskError>> {
    try {
      const startTime = Date.now();

      // Soft delete with audit trail
      await this.prisma.task.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: context.userId,
          updatedBy: context.userId
        }
      });

      // Invalidate caches
      await this.redis.del(CACHE_KEYS.TASK_BY_ID(id));
      await this.invalidateListCache();

      // Log telemetry
      context.telemetry.metrics.deleteDuration = Date.now() - startTime;
      context.telemetry.tags.taskId = id;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete task',
          details: { error }
        }
      };
    }
  }

  /**
   * Invalidates all list-related caches
   * @private
   */
  private async invalidateListCache(): Promise<void> {
    const pattern = CACHE_KEYS.TASK_LIST('*');
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}