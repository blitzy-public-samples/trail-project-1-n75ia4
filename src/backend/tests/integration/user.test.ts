/**
 * @fileoverview Integration tests for user management functionality
 * Testing complete flow from API endpoints through services to database operations
 * @version 1.0.0
 */

import { Container } from 'inversify'; // v6.0+
import { performance } from 'perf_hooks'; // v1.0.0
import { UserService } from '../../src/services/user.service';
import { 
  UserRole, 
  UserStatus, 
  CreateUserDTO, 
  UpdateUserDTO,
  UserPreferences 
} from '../../src/types/user.types';
import { StatusCode } from '../../src/constants/status-codes';
import { ErrorCode } from '../../src/constants/error-codes';
import { enhancedLogger as logger } from '../../src/utils/logger.util';

// Performance threshold from technical specifications (500ms)
const PERFORMANCE_THRESHOLD = 500;

// Test security context
const TEST_SECURITY_CONTEXT = {
  encryption: 'AES-256-GCM',
  classification: 'CONFIDENTIAL',
  validation: 'STRICT'
};

/**
 * Helper function to generate test user data
 */
const generateTestUser = (role: UserRole): CreateUserDTO => ({
  email: `test.${Date.now()}@example.com`,
  name: `Test User ${Date.now()}`,
  role,
  preferences: {
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      inApp: true,
      taskUpdates: true,
      projectUpdates: true
    }
  }
});

describe('User Management Integration Tests', () => {
  let container: Container;
  let userService: UserService;

  beforeAll(async () => {
    // Initialize test container and dependencies
    container = new Container();
    container.bind<UserService>('UserService').to(UserService);
    userService = container.get<UserService>('UserService');

    logger.info('Starting user management integration tests');
  });

  afterAll(async () => {
    // Cleanup test data and connections
    logger.info('Completing user management integration tests');
  });

  describe('User Creation and Security', () => {
    it('should create user with proper security measures', async () => {
      const startTime = performance.now();
      const testUser = generateTestUser(UserRole.TEAM_MEMBER);

      const createdUser = await userService.create(testUser);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance validation
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // Data validation
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(testUser.email);
      expect(createdUser.role).toBe(UserRole.TEAM_MEMBER);
      expect(createdUser.status).toBe(UserStatus.PENDING);

      // Security validation
      expect(createdUser.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should prevent duplicate user creation', async () => {
      const testUser = generateTestUser(UserRole.TEAM_MEMBER);
      await userService.create(testUser);

      await expect(userService.create(testUser))
        .rejects
        .toThrow('User with this email already exists');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce role hierarchy in user updates', async () => {
      const adminUser = await userService.create(generateTestUser(UserRole.ADMIN));
      const teamMember = await userService.create(generateTestUser(UserRole.TEAM_MEMBER));

      // Admin can update team member's role
      const updatedByAdmin = await userService.update(teamMember.id, {
        role: UserRole.TEAM_LEAD
      });
      expect(updatedByAdmin.role).toBe(UserRole.TEAM_LEAD);

      // Team member cannot update admin's role
      await expect(userService.update(adminUser.id, {
        role: UserRole.TEAM_MEMBER
      })).rejects.toThrow('Invalid role update');
    });

    it('should validate permissions based on role', async () => {
      const projectManager = await userService.create(generateTestUser(UserRole.PROJECT_MANAGER));
      const teamMember = await userService.create(generateTestUser(UserRole.TEAM_MEMBER));

      // Project manager can view team member details
      const viewedByManager = await userService.findById(teamMember.id);
      expect(viewedByManager).toBeDefined();

      // Team member cannot perform admin actions
      await expect(userService.delete(projectManager.id))
        .rejects
        .toThrow('Insufficient permissions');
    });
  });

  describe('Data Security and Privacy', () => {
    it('should handle sensitive data securely', async () => {
      const testUser = generateTestUser(UserRole.TEAM_MEMBER);
      const createdUser = await userService.create(testUser);

      // Verify sensitive data handling
      expect(createdUser).not.toHaveProperty('password');
      expect(createdUser).not.toHaveProperty('securityQuestions');
      expect(createdUser.email).toBe(testUser.email);
    });

    it('should maintain data classification compliance', async () => {
      const testUser = generateTestUser(UserRole.TEAM_LEAD);
      const createdUser = await userService.create(testUser);

      // Verify data classification
      const userDetails = await userService.findById(createdUser.id);
      expect(userDetails._securityLevel).toBe('CONFIDENTIAL');
      expect(userDetails._dataClassification).toBe('USER_DATA');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent user operations within performance threshold', async () => {
      const startTime = performance.now();
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(userService.create(generateTestUser(UserRole.TEAM_MEMBER)));
      }

      await Promise.all(operations);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);
    });

    it('should maintain performance under load', async () => {
      const users = [];
      const startTime = performance.now();

      // Create test users
      for (let i = 0; i < 5; i++) {
        const user = await userService.create(generateTestUser(UserRole.TEAM_MEMBER));
        users.push(user);
      }

      // Perform multiple read operations
      const readOperations = users.map(user => userService.findById(user.id));
      await Promise.all(readOperations);

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / (users.length * 2); // Create + Read operations

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLD / 2);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid user data appropriately', async () => {
      const invalidUser = {
        email: 'invalid-email',
        name: '',
        role: 'INVALID_ROLE'
      } as any;

      await expect(userService.create(invalidUser))
        .rejects
        .toThrow('Request validation failed');
    });

    it('should handle non-existent user operations', async () => {
      const nonExistentId = '00000000-0000-4000-a000-000000000000';

      await expect(userService.findById(nonExistentId))
        .rejects
        .toThrow('User not found');
    });
  });
});