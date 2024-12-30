/**
 * @fileoverview Comprehensive unit tests for TaskService
 * @version 1.0.0
 */

// External imports - with versions
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // v29.x
import { v4 as uuidv4 } from 'uuid'; // v9.x

// Internal imports
import { TaskService } from '../../../src/services/task.service';
import { TaskRepository } from '../../../src/repositories/task.repository';
import { WebSocketService } from '../../../src/services/websocket.service';
import { CacheService } from '../../../src/services/cache.service';
import { TaskStatus, TaskPriority } from '../../../src/types/task.types';
import { 
  ITask, 
  ICreateTaskDTO, 
  IUpdateTaskDTO, 
  ITaskContext,
  TaskError 
} from '../../../src/interfaces/task.interface';

// Constants
const PERFORMANCE_THRESHOLD = 500; // 500ms as per technical specifications

describe('TaskService', () => {
  // Mock dependencies
  let mockTaskRepository: jest.Mocked<TaskRepository>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let taskService: TaskService;

  // Test data
  const testUserId = uuidv4();
  const testProjectId = uuidv4();
  const testTaskId = uuidv4();

  const mockContext: ITaskContext = {
    userId: testUserId,
    correlationId: 'test-correlation-id',
    requestId: 'test-request-id',
    includeSoftDeleted: false,
    telemetry: {
      operationStart: new Date(),
      operationName: 'test',
      metrics: {},
      tags: {}
    }
  };

  beforeEach(() => {
    // Initialize mocks
    mockTaskRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      beginTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn()
    } as unknown as jest.Mocked<TaskRepository>;

    mockWebSocketService = {
      broadcast: jest.fn(),
      sendToClient: jest.fn(),
      notifyTaskUpdate: jest.fn()
    } as unknown as jest.Mocked<WebSocketService>;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      invalidatePattern: jest.fn()
    } as unknown as jest.Mocked<CacheService>;

    // Initialize TaskService with mocks
    taskService = new TaskService(
      mockTaskRepository,
      mockWebSocketService,
      mockCacheService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const validTaskData: ICreateTaskDTO = {
      title: 'Test Task',
      description: 'Test Description',
      priority: TaskPriority.HIGH,
      projectId: testProjectId,
      dueDate: new Date('2024-12-31'),
      tags: ['test'],
      metadata: { key: 'value' }
    };

    it('should create a task successfully within performance threshold', async () => {
      // Setup
      const createdTask: ITask = {
        id: testTaskId,
        ...validTaskData,
        status: TaskStatus.TODO,
        assigneeId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: testUserId,
        updatedBy: testUserId,
        version: 1,
        attachmentIds: []
      };

      mockTaskRepository.create.mockResolvedValue({ 
        success: true, 
        data: createdTask 
      });

      // Execute
      const startTime = Date.now();
      const result = await taskService.createTask(validTaskData, mockContext);
      const duration = Date.now() - startTime;

      // Verify
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdTask);
      
      // Verify repository call
      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        validTaskData,
        mockContext
      );

      // Verify cache operations
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `task:${testTaskId}`,
        createdTask,
        3600
      );

      // Verify WebSocket notification
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'task-updates',
        {
          type: 'TASK_CREATED',
          task: createdTask,
          userId: mockContext.userId
        }
      );
    });

    it('should handle validation errors correctly', async () => {
      // Setup
      const invalidTaskData: ICreateTaskDTO = {
        ...validTaskData,
        title: '', // Invalid empty title
      };

      // Execute
      const result = await taskService.createTask(invalidTaskData, mockContext);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Task title is required'
      });
      
      // Verify no repository call
      expect(mockTaskRepository.create).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).not.toHaveBeenCalled();
    });

    it('should handle repository errors and rollback transaction', async () => {
      // Setup
      mockTaskRepository.create.mockResolvedValue({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection failed'
        }
      });

      // Execute
      const result = await taskService.createTask(validTaskData, mockContext);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    const updateData: IUpdateTaskDTO = {
      title: 'Updated Task',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      version: 1
    };

    it('should update task successfully with optimistic locking', async () => {
      // Setup
      const updatedTask: ITask = {
        id: testTaskId,
        title: updateData.title!,
        description: 'Test Description',
        status: updateData.status!,
        priority: updateData.priority!,
        projectId: testProjectId,
        assigneeId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: testUserId,
        updatedBy: testUserId,
        version: 2,
        dueDate: new Date(),
        metadata: {},
        tags: [],
        attachmentIds: []
      };

      mockTaskRepository.update.mockResolvedValue({
        success: true,
        data: updatedTask
      });

      // Execute
      const startTime = Date.now();
      const result = await taskService.updateTask(
        testTaskId,
        updateData,
        mockContext
      );
      const duration = Date.now() - startTime;

      // Verify
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedTask);

      // Verify cache operations
      expect(mockCacheService.delete).toHaveBeenCalledWith(`task:${testTaskId}`);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `task:${testTaskId}`,
        updatedTask,
        3600
      );

      // Verify WebSocket notification
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'task-updates',
        {
          type: 'TASK_UPDATED',
          task: updatedTask,
          userId: mockContext.userId
        }
      );
    });

    it('should handle version conflicts correctly', async () => {
      // Setup
      mockTaskRepository.update.mockResolvedValue({
        success: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Task has been modified by another user'
        }
      });

      // Execute
      const result = await taskService.updateTask(
        testTaskId,
        updateData,
        mockContext
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERSION_CONFLICT');
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).not.toHaveBeenCalled();
    });
  });

  describe('getTaskById', () => {
    const mockTask: ITask = {
      id: testTaskId,
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      projectId: testProjectId,
      assigneeId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: testUserId,
      updatedBy: testUserId,
      version: 1,
      dueDate: new Date(),
      metadata: {},
      tags: [],
      attachmentIds: []
    };

    it('should retrieve task from cache when available', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(mockTask);

      // Execute
      const startTime = Date.now();
      const result = await taskService.getTaskById(testTaskId, mockContext);
      const duration = Date.now() - startTime;

      // Verify
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTask);
      expect(mockTaskRepository.findById).not.toHaveBeenCalled();
    });

    it('should retrieve task from repository when not in cache', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(null);
      mockTaskRepository.findById.mockResolvedValue({
        success: true,
        data: mockTask
      });

      // Execute
      const result = await taskService.getTaskById(testTaskId, mockContext);

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTask);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `task:${testTaskId}`,
        mockTask,
        3600
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete task and update cache/notifications', async () => {
      // Setup
      mockTaskRepository.delete.mockResolvedValue({ success: true });

      // Execute
      const startTime = Date.now();
      const result = await taskService.deleteTask(testTaskId, mockContext);
      const duration = Date.now() - startTime;

      // Verify
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(result.success).toBe(true);

      // Verify cache operations
      expect(mockCacheService.delete).toHaveBeenCalledWith(`task:${testTaskId}`);

      // Verify WebSocket notification
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'task-updates',
        {
          type: 'TASK_DELETED',
          taskId: testTaskId,
          userId: mockContext.userId
        }
      );
    });
  });
});