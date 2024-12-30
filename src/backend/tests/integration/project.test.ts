/**
 * @fileoverview Integration tests for project management functionality
 * @version 1.0.0
 */

// External imports - versions specified as per technical requirements
import { describe, it, beforeEach, afterEach, expect, jest } from 'jest'; // v29.7.0
import { faker } from '@faker-js/faker'; // v8.3.1
import supertest from 'supertest'; // v6.3.3
import { UUID } from 'crypto';

// Internal imports
import { ProjectService } from '../../src/services/project.service';
import { ProjectStatus, ProjectPriority } from '../../src/types/project.types';
import { UserRole } from '../../src/types/user.types';
import { ICreateProjectDTO, IUpdateProjectDTO } from '../../src/interfaces/project.interface';

// Test environment setup
let projectService: ProjectService;
let mockProjectRepository: jest.Mocked<any>;
let mockCacheService: jest.Mocked<any>;
let mockWebSocketService: jest.Mocked<any>;
let mockLogger: jest.Mocked<any>;

/**
 * Generates mock project data for testing
 * @param overrides Optional field overrides
 */
const generateMockProject = (overrides: Partial<ICreateProjectDTO> = {}): ICreateProjectDTO => ({
  name: faker.company.name(),
  description: faker.lorem.paragraph(),
  priority: faker.helpers.arrayElement(Object.values(ProjectPriority)),
  startDate: faker.date.future(),
  endDate: faker.date.future({ years: 1 }),
  teamMembers: Array.from({ length: 3 }, () => faker.string.uuid() as UUID),
  ...overrides
});

/**
 * Sets up test environment before each test
 */
beforeEach(() => {
  // Mock repository
  mockProjectRepository = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn()
  };

  // Mock cache service
  mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };

  // Mock WebSocket service
  mockWebSocketService = {
    broadcast: jest.fn()
  };

  // Mock logger
  mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  };

  // Initialize service with mocks
  projectService = new ProjectService(
    mockProjectRepository,
    mockCacheService,
    mockWebSocketService,
    mockLogger
  );
});

/**
 * Clean up after each test
 */
afterEach(() => {
  jest.clearAllMocks();
});

describe('Project Service Integration Tests', () => {
  describe('Project Creation', () => {
    it('should successfully create a project with valid data', async () => {
      // Arrange
      const mockData = generateMockProject();
      const mockUserId = faker.string.uuid() as UUID;
      const expectedProject = {
        ...mockData,
        id: faker.string.uuid(),
        status: ProjectStatus.PLANNED,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectRepository.create.mockResolvedValue(expectedProject);

      // Act
      const result = await projectService.createProject(mockData, mockUserId);

      // Assert
      expect(result).toEqual(expectedProject);
      expect(mockProjectRepository.create).toHaveBeenCalledWith({
        ...mockData,
        ownerId: mockUserId,
        status: ProjectStatus.PLANNED,
        version: 1
      });
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).toHaveBeenCalled();
    });

    it('should validate project data before creation', async () => {
      // Arrange
      const invalidData = generateMockProject({ name: '' });
      const mockUserId = faker.string.uuid() as UUID;

      // Act & Assert
      await expect(projectService.createProject(invalidData, mockUserId))
        .rejects.toThrow('Invalid project data');
    });

    it('should handle database errors during creation', async () => {
      // Arrange
      const mockData = generateMockProject();
      const mockUserId = faker.string.uuid() as UUID;
      mockProjectRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(projectService.createProject(mockData, mockUserId))
        .rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Project Updates', () => {
    it('should successfully update a project with valid data', async () => {
      // Arrange
      const projectId = faker.string.uuid() as UUID;
      const mockUserId = faker.string.uuid() as UUID;
      const updateData: IUpdateProjectDTO = {
        name: faker.company.name(),
        priority: ProjectPriority.HIGH
      };

      const existingProject = {
        id: projectId,
        ownerId: mockUserId,
        version: 1,
        teamMembers: [mockUserId]
      };

      mockProjectRepository.findById.mockResolvedValue(existingProject);
      mockProjectRepository.update.mockResolvedValue({
        ...existingProject,
        ...updateData,
        version: 2
      });

      // Act
      const result = await projectService.updateProject(projectId, updateData, mockUserId);

      // Assert
      expect(result.version).toBe(2);
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).toHaveBeenCalled();
    });

    it('should handle optimistic locking conflicts', async () => {
      // Arrange
      const projectId = faker.string.uuid() as UUID;
      const mockUserId = faker.string.uuid() as UUID;
      const updateData: IUpdateProjectDTO = { name: faker.company.name() };

      mockProjectRepository.update.mockRejectedValue(
        new Error('Optimistic lock version mismatch')
      );

      // Act & Assert
      await expect(projectService.updateProject(projectId, updateData, mockUserId))
        .rejects.toThrow('Optimistic lock version mismatch');
    });
  });

  describe('Project Queries', () => {
    it('should retrieve project with cache hit', async () => {
      // Arrange
      const projectId = faker.string.uuid() as UUID;
      const cachedProject = generateMockProject();
      mockCacheService.get.mockResolvedValue(JSON.stringify(cachedProject));

      // Act
      const result = await projectService.getProjectById(projectId);

      // Assert
      expect(result).toEqual(cachedProject);
      expect(mockProjectRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle cache miss and fetch from database', async () => {
      // Arrange
      const projectId = faker.string.uuid() as UUID;
      const dbProject = generateMockProject();
      mockCacheService.get.mockResolvedValue(null);
      mockProjectRepository.findById.mockResolvedValue(dbProject);

      // Act
      const result = await projectService.getProjectById(projectId);

      // Assert
      expect(result).toEqual(dbProject);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('Project Hierarchy', () => {
    it('should retrieve and cache project hierarchy', async () => {
      // Arrange
      const mockProjects = Array.from({ length: 3 }, () => ({
        ...generateMockProject(),
        id: faker.string.uuid()
      }));

      mockProjectRepository.findAll.mockResolvedValue({
        data: mockProjects,
        total: mockProjects.length
      });

      // Act
      const result = await projectService.getProjectsHierarchy({
        page: 1,
        limit: 10
      });

      // Assert
      expect(result.nodes).toBeDefined();
      expect(Object.keys(result.nodes).length).toBe(mockProjects.length);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });
});