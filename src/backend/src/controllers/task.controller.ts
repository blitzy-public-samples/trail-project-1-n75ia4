/**
 * @fileoverview Enterprise-grade task controller implementing RESTful endpoints
 * @version 1.0.0
 * @module controllers/task
 */

// External imports with versions
import { injectable, inject } from 'inversify'; // v6.0.1
import {
  controller,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  request,
  response,
  requestParam,
  queryParam
} from 'inversify-express-utils'; // v6.4.3
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit'; // v6.7.0
import cache from 'express-cache-middleware'; // v1.0.1
import monitor from 'express-status-monitor'; // v1.3.4
import { validate } from 'class-validator'; // v0.14.0
import { plainToClass } from 'class-transformer'; // v0.5.1
import { UUID } from 'crypto';

// Internal imports
import { TaskService } from '../services/task.service';
import { CreateTaskDTO, UpdateTaskDTO, TaskQueryDTO } from '../dto/task.dto';
import { ITaskContext, Result, TaskError, ITask, ITaskPaginatedResponse } from '../interfaces/task.interface';
import { TYPES } from '../config/types';

// Rate limiting configuration
const createTaskLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: 'Too many task creation requests, please try again later'
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

/**
 * Enterprise-grade task controller implementing RESTful endpoints with
 * comprehensive validation, error handling, caching, and monitoring
 */
@injectable()
@controller('/api/v1/tasks')
@monitor()
export class TaskController {
  constructor(
    @inject(TYPES.TaskService) private readonly taskService: TaskService
  ) {}

  /**
   * Creates a new task with comprehensive validation
   * @route POST /api/v1/tasks
   */
  @httpPost('/')
  @createTaskLimiter
  async createTask(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      // Transform and validate request body
      const taskDto = plainToClass(CreateTaskDTO, req.body);
      const errors = await validate(taskDto);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: errors
          }
        });
      }

      // Create task context
      const context: ITaskContext = {
        userId: req.user.id,
        correlationId: req.headers['x-correlation-id'] as string,
        requestId: req.id,
        includeSoftDeleted: false,
        telemetry: {
          operationStart: new Date(),
          operationName: 'createTask',
          metrics: {},
          tags: {}
        }
      };

      // Create task
      const result = await this.taskService.createTask(taskDto, context);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create task',
          details: error
        }
      });
    }
  }

  /**
   * Updates an existing task with optimistic locking
   * @route PUT /api/v1/tasks/:id
   */
  @httpPut('/:id')
  @generalLimiter
  async updateTask(
    @requestParam('id') id: UUID,
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      // Transform and validate request body
      const taskDto = plainToClass(UpdateTaskDTO, req.body);
      const errors = await validate(taskDto);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: errors
          }
        });
      }

      const context: ITaskContext = {
        userId: req.user.id,
        correlationId: req.headers['x-correlation-id'] as string,
        requestId: req.id,
        includeSoftDeleted: false,
        telemetry: {
          operationStart: new Date(),
          operationName: 'updateTask',
          metrics: {},
          tags: {}
        }
      };

      const result = await this.taskService.updateTask(id, taskDto, context);

      if (!result.success) {
        return res.status(result.error?.code === 'NOT_FOUND' ? 404 : 400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update task',
          details: error
        }
      });
    }
  }

  /**
   * Retrieves a task by ID with caching
   * @route GET /api/v1/tasks/:id
   */
  @httpGet('/:id')
  @generalLimiter
  @cache({
    ttl: 300, // 5 minutes
    key: (req: Request) => `task:${req.params.id}`
  })
  async getTaskById(
    @requestParam('id') id: UUID,
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      const context: ITaskContext = {
        userId: req.user.id,
        correlationId: req.headers['x-correlation-id'] as string,
        requestId: req.id,
        includeSoftDeleted: false,
        telemetry: {
          operationStart: new Date(),
          operationName: 'getTaskById',
          metrics: {},
          tags: {}
        }
      };

      const result = await this.taskService.getTaskById(id, context);

      if (!result.success || !result.data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve task',
          details: error
        }
      });
    }
  }

  /**
   * Retrieves tasks with enhanced filtering and pagination
   * @route GET /api/v1/tasks
   */
  @httpGet('/')
  @generalLimiter
  @cache({
    ttl: 60, // 1 minute
    key: (req: Request) => `tasks:${JSON.stringify(req.query)}`
  })
  async getTasks(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      // Transform and validate query parameters
      const queryDto = plainToClass(TaskQueryDTO, req.query);
      const errors = await validate(queryDto);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors
          }
        });
      }

      const context: ITaskContext = {
        userId: req.user.id,
        correlationId: req.headers['x-correlation-id'] as string,
        requestId: req.id,
        includeSoftDeleted: false,
        telemetry: {
          operationStart: new Date(),
          operationName: 'getTasks',
          metrics: {},
          tags: {}
        }
      };

      const result = await this.taskService.getTasks(queryDto, context);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tasks',
          details: error
        }
      });
    }
  }

  /**
   * Soft deletes a task by ID
   * @route DELETE /api/v1/tasks/:id
   */
  @httpDelete('/:id')
  @generalLimiter
  async deleteTask(
    @requestParam('id') id: UUID,
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      const context: ITaskContext = {
        userId: req.user.id,
        correlationId: req.headers['x-correlation-id'] as string,
        requestId: req.id,
        includeSoftDeleted: false,
        telemetry: {
          operationStart: new Date(),
          operationName: 'deleteTask',
          metrics: {},
          tags: {}
        }
      };

      const result = await this.taskService.deleteTask(id, context);

      if (!result.success) {
        return res.status(result.error?.code === 'NOT_FOUND' ? 404 : 400).json(result);
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete task',
          details: error
        }
      });
    }
  }
}