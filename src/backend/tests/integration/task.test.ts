/**
 * @fileoverview Integration tests for task management endpoints
 * @version 1.0.0
 */

import request from 'supertest'; // v6.3.3
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from '@jest/globals'; // v29.7.0
import { app } from '../../src/app';
import { TaskStatus, TaskPriority, CreateTaskDTO, UpdateTaskDTO } from '../../src/types/task.types';
import { TaskRepository } from '../../src/repositories/task.repository';
import { enhancedLogger as logger } from '../../utils/logger.util';

// Constants
const API_BASE_URL = '/api/v1/tasks';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
let testUser: { id: string; email: string; token: string };
let testTasks: any[] = [];

/**
 * Sets up test environment with necessary configuration
 */
const setupTestEnvironment = async (): Promise<void> => {
  try {
    // Load test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.REDIS_HOST = 'localhost';

    // Initialize test database connection
    await TaskRepository.initialize({
      host: process.env.TEST_DB_HOST,
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME,
    });

    logger.info('Test environment setup completed');
  } catch (error) {
    logger.error('Failed to setup test environment:', error);
    throw error;
  }
};

/**
 * Creates test user and generates authentication token
 */
const setupTestUser = async (): Promise<void> => {
  testUser = {
    id: '12345678-1234-1234-1234-123456789012',
    email: 'test@example.com',
    token: 'Bearer test-token'
  };
};

/**
 * Cleans up test data after tests
 */
const cleanupDatabase = async (): Promise<void> => {
  try {
    await TaskRepository.clearDatabase();
    logger.info('Test database cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup test database:', error);
    throw error;
  }
};

describe('Task Management API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    await setupTestUser();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(() => {
    testTasks = [];
  });

  describe('Task Creation', () => {
    it('should create a task with valid data', async () => {
      const taskData: CreateTaskDTO = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.HIGH,
        projectId: '12345678-1234-1234-1234-123456789012',
        assigneeId: testUser.id,
        dueDate: new Date(Date.now() + 86400000) // Tomorrow
      };

      const response = await request(app)
        .post(API_BASE_URL)
        .set('Authorization', testUser.token)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        status: TaskStatus.TODO
      });
    });

    it('should reject task creation with invalid data', async () => {
      const invalidData = {
        title: '', // Empty title
        priority: 'INVALID',
        projectId: 'invalid-id'
      };

      const response = await request(app)
        .post(API_BASE_URL)
        .set('Authorization', testUser.token)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce rate limiting on task creation', async () => {
      const taskData: CreateTaskDTO = {
        title: 'Rate Limit Test',
        priority: TaskPriority.MEDIUM,
        projectId: '12345678-1234-1234-1234-123456789012'
      };

      // Send multiple requests rapidly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post(API_BASE_URL)
          .set('Authorization', testUser.token)
          .send(taskData)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(r => r.status === 429);
      expect(tooManyRequests).toBe(true);
    });
  });

  describe('Task Retrieval', () => {
    let testTaskId: string;

    beforeEach(async () => {
      // Create a test task
      const response = await request(app)
        .post(API_BASE_URL)
        .set('Authorization', testUser.token)
        .send({
          title: 'Test Task',
          priority: TaskPriority.MEDIUM,
          projectId: '12345678-1234-1234-1234-123456789012'
        });

      testTaskId = response.body.data.id;
    });

    it('should retrieve a task by ID', async () => {
      const response = await request(app)
        .get(`${API_BASE_URL}/${testTaskId}`)
        .set('Authorization', testUser.token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTaskId);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get(`${API_BASE_URL}/12345678-1234-1234-1234-123456789999`)
        .set('Authorization', testUser.token)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should retrieve tasks with filtering and pagination', async () => {
      const response = await request(app)
        .get(API_BASE_URL)
        .query({
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          page: 1,
          limit: 10
        })
        .set('Authorization', testUser.token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });
  });

  describe('Task Updates', () => {
    let testTaskId: string;

    beforeEach(async () => {
      // Create a test task
      const response = await request(app)
        .post(API_BASE_URL)
        .set('Authorization', testUser.token)
        .send({
          title: 'Update Test Task',
          priority: TaskPriority.LOW,
          projectId: '12345678-1234-1234-1234-123456789012'
        });

      testTaskId = response.body.data.id;
    });

    it('should update a task with valid data', async () => {
      const updateData: UpdateTaskDTO = {
        title: 'Updated Task',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH
      };

      const response = await request(app)
        .put(`${API_BASE_URL}/${testTaskId}`)
        .set('Authorization', testUser.token)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
    });

    it('should reject invalid update data', async () => {
      const invalidData = {
        status: 'INVALID_STATUS',
        priority: 'INVALID_PRIORITY'
      };

      const response = await request(app)
        .put(`${API_BASE_URL}/${testTaskId}`)
        .set('Authorization', testUser.token)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle concurrent updates correctly', async () => {
      const updateData = { title: 'Concurrent Update' };

      // Send multiple concurrent updates
      const updates = Array(5).fill(null).map(() =>
        request(app)
          .put(`${API_BASE_URL}/${testTaskId}`)
          .set('Authorization', testUser.token)
          .send(updateData)
      );

      const responses = await Promise.all(updates);
      const successfulUpdates = responses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBe(1); // Only one should succeed
    });
  });

  describe('Task Deletion', () => {
    let testTaskId: string;

    beforeEach(async () => {
      // Create a test task
      const response = await request(app)
        .post(API_BASE_URL)
        .set('Authorization', testUser.token)
        .send({
          title: 'Delete Test Task',
          priority: TaskPriority.LOW,
          projectId: '12345678-1234-1234-1234-123456789012'
        });

      testTaskId = response.body.data.id;
    });

    it('should soft delete a task', async () => {
      await request(app)
        .delete(`${API_BASE_URL}/${testTaskId}`)
        .set('Authorization', testUser.token)
        .expect(204);

      // Verify task is not retrievable
      const response = await request(app)
        .get(`${API_BASE_URL}/${testTaskId}`)
        .set('Authorization', testUser.token)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should return 404 when deleting non-existent task', async () => {
      const response = await request(app)
        .delete(`${API_BASE_URL}/12345678-1234-1234-1234-123456789999`)
        .set('Authorization', testUser.token)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Security Tests', () => {
    it('should reject requests without authentication', async () => {
      await request(app)
        .get(API_BASE_URL)
        .expect(401);
    });

    it('should reject requests with invalid authentication', async () => {
      await request(app)
        .get(API_BASE_URL)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should enforce role-based access control', async () => {
      // Create task with guest user
      const guestToken = 'Bearer guest-token';
      const response = await request(app)
        .post(API_BASE_URL)
        .set('Authorization', guestToken)
        .send({
          title: 'Guest Task',
          priority: TaskPriority.LOW,
          projectId: '12345678-1234-1234-1234-123456789012'
        })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Performance Tests', () => {
    it('should respond within performance SLA', async () => {
      const start = Date.now();
      
      await request(app)
        .get(API_BASE_URL)
        .set('Authorization', testUser.token)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // 500ms SLA
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get(API_BASE_URL)
          .set('Authorization', testUser.token)
      );

      const responses = await Promise.all(requests);
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBe(20);
    });
  });
});