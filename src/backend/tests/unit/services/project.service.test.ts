/**
 * @fileoverview Unit tests for ProjectService class
 * Covers project management, caching, real-time updates, and performance validation
 * @version 1.0.0
 */

// External imports - v29.0.0
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UUID } from 'crypto';

// Internal imports with mocking
import { ProjectService } from '../../src/services/project.service';
import { ProjectRepository } from '../../src/repositories/project.repository';
import { CacheService } from '../../src/services/cache.service';
import { WebSocketService } from '../../src/services/websocket.service';
import { ProjectStatus, ProjectPriority } from '../../src/types/project.types';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../src/utils/errors';

// Mock all dependencies
jest.mock('../../src/repositories/project.repository');
jest.mock('../../src/services/cache.service');
jest.mock('../../src/services/websocket.service');

// Test constants
const TEST_TIMEOUT = 5000;
const PERFORMANCE_THRESHOLD = 500; // 500ms as per technical specs

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: jest.Mocked<ProjectRepository>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;
  let mockLogger: any;

  // Test data
  const testUserId = 'test-user-id' as UUID;
  const testProjectId = 'test-project-id' as UUID;
  const testProject = {
    id: testProjectId,
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.PLANNED,
    priority: ProjectPriority.HIGH,
    ownerId: testUserId,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    teamMembers: [testUserId],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockProjectRepository = jest.mocked(ProjectRepository);
    mockCacheService = jest.mocked(CacheService);
    mockWebSocketService = jest.mocked(WebSocketService);
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    };

    // Create service instance with mocks
    projectService = new ProjectService(
      mockProjectRepository,
      mockCacheService,
      mockWebSocketService,
      mockLogger
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createProject', () => {
    const createProjectDTO = {
      name: 'New Project',
      description: 'Project Description',
      priority: ProjectPriority.HIGH,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      teamMembers: [testUserId]
    };

    it('should create a project successfully', async () => {
      // Arrange
      mockProjectRepository.create.mockResolvedValue(testProject);
      mockCacheService.set.mockResolvedValue();
      mockWebSocketService.broadcast.mockResolvedValue();

      // Act
      const startTime = Date.now();
      const result = await projectService.createProject(createProjectDTO, testUserId);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toEqual(testProject);
      expect(mockProjectRepository.create).toHaveBeenCalledWith({
        ...createProjectDTO,
        ownerId: testUserId,
        status: ProjectStatus.PLANNED,
        version: 1
      });
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).toHaveBeenCalled();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should handle validation errors', async () => {
      // Arrange
      const invalidDTO = { ...createProjectDTO, name: '' };

      // Act & Assert
      await expect(projectService.createProject(invalidDTO, testUserId))
        .rejects
        .toThrow(ValidationError);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockProjectRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(projectService.createProject(createProjectDTO, testUserId))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('updateProject', () => {
    const updateProjectDTO = {
      name: 'Updated Project',
      status: ProjectStatus.IN_PROGRESS,
      priority: ProjectPriority.MEDIUM
    };

    it('should update a project successfully', async () => {
      // Arrange
      const updatedProject = { ...testProject, ...updateProjectDTO };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.update.mockResolvedValue(updatedProject);
      mockCacheService.set.mockResolvedValue();
      mockWebSocketService.broadcast.mockResolvedValue();

      // Act
      const startTime = Date.now();
      const result = await projectService.updateProject(testProjectId, updateProjectDTO, testUserId);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toEqual(updatedProject);
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).toHaveBeenCalled();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should handle concurrent updates', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.update.mockRejectedValue(new Error('Version mismatch'));

      // Act & Assert
      await expect(projectService.updateProject(testProjectId, updateProjectDTO, testUserId))
        .rejects
        .toThrow('Version mismatch');
    });

    it('should handle unauthorized updates', async () => {
      // Arrange
      const unauthorizedUserId = 'unauthorized-user' as UUID;
      mockProjectRepository.findById.mockResolvedValue(testProject);

      // Act & Assert
      await expect(projectService.updateProject(testProjectId, updateProjectDTO, unauthorizedUserId))
        .rejects
        .toThrow(UnauthorizedError);
    });
  });

  describe('getProjectById', () => {
    it('should retrieve project from cache if available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(testProject);

      // Act
      const startTime = Date.now();
      const result = await projectService.getProjectById(testProjectId);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toEqual(testProject);
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockProjectRepository.findById).not.toHaveBeenCalled();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should retrieve project from database on cache miss', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockCacheService.set.mockResolvedValue();

      // Act
      const result = await projectService.getProjectById(testProjectId);

      // Assert
      expect(result).toEqual(testProject);
      expect(mockProjectRepository.findById).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle non-existent projects', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockProjectRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(projectService.getProjectById('non-existent-id' as UUID))
        .resolves
        .toBeNull();
    });
  });

  describe('getProjects', () => {
    const queryParams = {
      page: 1,
      limit: 10,
      status: ProjectStatus.IN_PROGRESS,
      priority: ProjectPriority.HIGH
    };

    it('should retrieve projects with pagination', async () => {
      // Arrange
      const projects = { data: [testProject], total: 1 };
      mockProjectRepository.findAll.mockResolvedValue(projects);

      // Act
      const startTime = Date.now();
      const result = await projectService.getProjects(queryParams);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toEqual(projects);
      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(queryParams);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should handle filtering and sorting', async () => {
      // Arrange
      const extendedParams = {
        ...queryParams,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const
      };
      mockProjectRepository.findAll.mockResolvedValue({ data: [testProject], total: 1 });

      // Act
      const result = await projectService.getProjects(extendedParams);

      // Assert
      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(extendedParams);
      expect(result.data).toHaveLength(1);
    });

    it('should handle empty result sets', async () => {
      // Arrange
      mockProjectRepository.findAll.mockResolvedValue({ data: [], total: 0 });

      // Act
      const result = await projectService.getProjects(queryParams);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.delete.mockResolvedValue();
      mockCacheService.delete.mockResolvedValue();
      mockWebSocketService.broadcast.mockResolvedValue();

      // Act
      const startTime = Date.now();
      await projectService.deleteProject(testProjectId, testUserId);
      const duration = Date.now() - startTime;

      // Assert
      expect(mockProjectRepository.delete).toHaveBeenCalledWith(testProjectId);
      expect(mockCacheService.delete).toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).toHaveBeenCalled();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should handle unauthorized deletion attempts', async () => {
      // Arrange
      const unauthorizedUserId = 'unauthorized-user' as UUID;
      mockProjectRepository.findById.mockResolvedValue(testProject);

      // Act & Assert
      await expect(projectService.deleteProject(testProjectId, unauthorizedUserId))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should handle non-existent project deletion', async () => {
      // Arrange
      mockProjectRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(projectService.deleteProject(testProjectId, testUserId))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});