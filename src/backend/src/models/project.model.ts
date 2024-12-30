/**
 * @fileoverview Enhanced Prisma model implementation for Project entity with CRUD operations,
 * caching, and optimized query handling
 * @version 1.0.0
 * @module models/project
 */

// External imports
import { PrismaClient } from '@prisma/client'; // v5.0+
import Redis from 'ioredis'; // v5.0+
import { UUID } from 'crypto';

// Internal imports
import { ProjectStatus, ProjectPriority, Project } from '../types/project.types';
import { IProject, ICreateProjectDTO, IUpdateProjectDTO, IProjectQueryParams } from '../interfaces/project.interface';

// Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Enhanced Prisma model implementation for Project entity
 * Implements caching, optimized queries, and robust error handling
 */
export class ProjectModel {
  private readonly prisma: PrismaClient;
  private readonly cache: Redis;
  private readonly CACHE_TTL = 3600; // Cache TTL in seconds
  private readonly CACHE_PREFIX = 'project:';

  constructor(prisma: PrismaClient, cache: Redis) {
    this.prisma = prisma;
    this.cache = cache;
  }

  /**
   * Creates a new project with validation and error handling
   * @throws {ValidationError} When validation fails
   * @throws {DatabaseError} When database operation fails
   */
  async create(data: ICreateProjectDTO): Promise<Project> {
    try {
      // Validate input data
      this.validateProjectData(data);

      // Start transaction
      const project = await this.prisma.$transaction(async (tx) => {
        // Create project
        const newProject = await tx.project.create({
          data: {
            name: data.name,
            description: data.description || '',
            status: ProjectStatus.PLANNED,
            priority: data.priority,
            startDate: data.startDate,
            endDate: data.endDate,
            teamMembers: {
              connect: data.teamMembers.map(id => ({ id }))
            }
          },
          include: {
            teamMembers: true,
            tasks: true
          }
        });

        return newProject;
      });

      // Invalidate relevant cache entries
      await this.invalidateProjectCache();

      return project;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Updates project with optimistic locking and validation
   * @throws {ValidationError} When validation fails
   * @throws {DatabaseError} When database operation fails
   */
  async update(id: UUID, data: IUpdateProjectDTO, version: number): Promise<Project> {
    try {
      // Validate update data
      if (data.startDate && data.endDate) {
        this.validateDateRange(data.startDate, data.endDate);
      }

      // Perform optimistic locking update
      const project = await this.prisma.$transaction(async (tx) => {
        const current = await tx.project.findUnique({
          where: { id },
          include: { teamMembers: true }
        });

        if (!current) {
          throw new ValidationError('Project not found');
        }

        if (current.version !== version) {
          throw new ValidationError('Project has been modified');
        }

        const updated = await tx.project.update({
          where: { id },
          data: {
            ...data,
            version: { increment: 1 },
            updatedAt: new Date(),
            teamMembers: data.teamMembers ? {
              set: data.teamMembers.map(id => ({ id }))
            } : undefined
          },
          include: {
            teamMembers: true,
            tasks: true
          }
        });

        return updated;
      });

      // Invalidate cache
      await this.invalidateProjectCache(id);

      return project;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Deletes project with cascading operations
   * @throws {ValidationError} When project not found
   * @throws {DatabaseError} When deletion fails
   */
  async delete(id: UUID): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete associated tasks
        await tx.task.deleteMany({
          where: { projectId: id }
        });

        // Delete project
        await tx.project.delete({
          where: { id }
        });
      });

      // Clear cache
      await this.invalidateProjectCache(id);
    } catch (error) {
      throw new DatabaseError(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Retrieves project with caching and optimized includes
   * @throws {DatabaseError} When retrieval fails
   */
  async findById(id: UUID): Promise<Project | null> {
    try {
      // Check cache
      const cached = await this.cache.get(`${this.CACHE_PREFIX}${id}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database
      const project = await this.prisma.project.findUnique({
        where: { id },
        include: {
          teamMembers: true,
          tasks: {
            include: {
              assignee: true
            }
          }
        }
      });

      if (project) {
        // Cache result
        await this.cache.setex(
          `${this.CACHE_PREFIX}${id}`,
          this.CACHE_TTL,
          JSON.stringify(project)
        );
      }

      return project;
    } catch (error) {
      throw new DatabaseError(`Failed to retrieve project: ${error.message}`);
    }
  }

  /**
   * Retrieves projects with cursor-based pagination and filtering
   * @throws {ValidationError} When query parameters are invalid
   * @throws {DatabaseError} When query fails
   */
  async findAll(params: IProjectQueryParams): Promise<{
    data: Project[];
    cursor: string;
    hasMore: boolean;
  }> {
    try {
      const limit = Math.min(params.limit || 20, 100);
      const query = this.buildProjectQuery(params);

      // Execute query with pagination
      const projects = await this.prisma.project.findMany({
        ...query,
        take: limit + 1,
        include: {
          teamMembers: true,
          tasks: {
            include: {
              assignee: true
            }
          }
        }
      });

      const hasMore = projects.length > limit;
      const data = hasMore ? projects.slice(0, -1) : projects;
      const lastItem = data[data.length - 1];

      return {
        data,
        cursor: lastItem?.id || '',
        hasMore
      };
    } catch (error) {
      throw new DatabaseError(`Failed to retrieve projects: ${error.message}`);
    }
  }

  /**
   * Validates project data against schema
   * @throws {ValidationError} When validation fails
   */
  private validateProjectData(data: ICreateProjectDTO): void {
    if (!data.name || data.name.length < 3 || data.name.length > 100) {
      throw new ValidationError('Invalid project name length');
    }

    if (data.description && data.description.length > 1000) {
      throw new ValidationError('Description exceeds maximum length');
    }

    this.validateDateRange(data.startDate, data.endDate);

    if (!data.teamMembers || data.teamMembers.length === 0) {
      throw new ValidationError('Project must have at least one team member');
    }
  }

  /**
   * Validates date range for project
   * @throws {ValidationError} When date range is invalid
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new ValidationError('End date must be after start date');
    }
  }

  /**
   * Builds optimized query based on parameters
   */
  private buildProjectQuery(params: IProjectQueryParams): any {
    const query: any = {
      where: {}
    };

    if (params.status) {
      query.where.status = params.status;
    }

    if (params.priority) {
      query.where.priority = params.priority;
    }

    if (params.ownerId) {
      query.where.ownerId = params.ownerId;
    }

    if (params.teamMemberId) {
      query.where.teamMembers = {
        some: { id: params.teamMemberId }
      };
    }

    if (params.startDate) {
      query.where.startDate = {
        gte: params.startDate
      };
    }

    if (params.endDate) {
      query.where.endDate = {
        lte: params.endDate
      };
    }

    if (params.sortBy) {
      query.orderBy = {
        [params.sortBy]: params.sortOrder || 'asc'
      };
    }

    return query;
  }

  /**
   * Invalidates project cache entries
   */
  private async invalidateProjectCache(id?: UUID): Promise<void> {
    if (id) {
      await this.cache.del(`${this.CACHE_PREFIX}${id}`);
    }
    await this.cache.del(`${this.CACHE_PREFIX}list`);
  }
}