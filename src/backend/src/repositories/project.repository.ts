/**
 * @fileoverview Project repository implementation with advanced data access patterns
 * @version 1.0.0
 * @module repositories/project
 */

// External imports
import { PrismaClient, Prisma } from '@prisma/client'; // v5.0+
import { Redis } from 'ioredis'; // v5.0+
import { injectable, inject } from 'inversify'; // v6.0+
import { Logger } from 'winston'; // v3.0+
import { UUID } from 'crypto';

// Internal imports
import {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectQueryParams,
  ProjectStatus,
  ProjectPriority
} from '../types/project.types';
import { IProject, IProjectRepository } from '../interfaces/project.interface';

// Constants
const CACHE_TTL = 3600; // 1 hour cache TTL
const CACHE_PREFIX = 'project:';
const DEFAULT_PAGE_SIZE = 20;

/**
 * Repository implementation for project-related database operations
 * Implements caching, transactions, and audit trails
 */
@injectable()
export class ProjectRepository implements IProjectRepository {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly logger: Logger;

  constructor(
    @inject('PrismaClient') prisma: PrismaClient,
    @inject('Redis') redis: Redis,
    @inject('Logger') logger: Logger
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Creates a new project with validation and transaction support
   * @param data Project creation data
   * @returns Newly created project
   * @throws {PrismaError} Database operation failure
   */
  async create(data: CreateProjectDTO): Promise<Project> {
    this.logger.debug('Creating new project', { data });

    return await this.prisma.$transaction(async (tx) => {
      // Create the project with audit fields
      const project = await tx.project.create({
        data: {
          ...data,
          status: ProjectStatus.PLANNED,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          teamMembers: {
            create: data.teamMembers.map(memberId => ({
              userId: memberId,
              joinedAt: new Date()
            }))
          }
        },
        include: {
          teamMembers: true,
          owner: true
        }
      });

      // Invalidate relevant cache entries
      await this.invalidateProjectCache(project.id);

      this.logger.info('Project created successfully', { projectId: project.id });
      return project;
    });
  }

  /**
   * Updates project with optimistic locking and validation
   * @param id Project ID
   * @param data Update data
   * @param version Current version for optimistic locking
   * @returns Updated project
   * @throws {PrismaError} Database operation failure
   * @throws {OptimisticLockError} Version mismatch
   */
  async update(id: UUID, data: UpdateProjectDTO, version: number): Promise<Project> {
    this.logger.debug('Updating project', { id, data, version });

    return await this.prisma.$transaction(async (tx) => {
      // Optimistic locking check
      const current = await tx.project.findUnique({
        where: { id },
        select: { version: true }
      });

      if (!current || current.version !== version) {
        throw new Error('Optimistic lock version mismatch');
      }

      // Update project with audit trail
      const updated = await tx.project.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
          version: { increment: 1 },
          teamMembers: data.teamMembers ? {
            deleteMany: {},
            create: data.teamMembers.map(memberId => ({
              userId: memberId,
              joinedAt: new Date()
            }))
          } : undefined
        },
        include: {
          teamMembers: true,
          owner: true
        }
      });

      // Invalidate cache
      await this.invalidateProjectCache(id);

      this.logger.info('Project updated successfully', { projectId: id });
      return updated;
    });
  }

  /**
   * Soft deletes project and related records
   * @param id Project ID
   * @throws {PrismaError} Database operation failure
   */
  async delete(id: UUID): Promise<void> {
    this.logger.debug('Soft deleting project', { id });

    await this.prisma.$transaction(async (tx) => {
      // Soft delete associated records
      await tx.projectTeamMember.updateMany({
        where: { projectId: id },
        data: { deletedAt: new Date() }
      });

      // Soft delete project
      await tx.project.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
          version: { increment: 1 }
        }
      });

      // Invalidate cache
      await this.invalidateProjectCache(id);
    });

    this.logger.info('Project soft deleted successfully', { projectId: id });
  }

  /**
   * Retrieves project by ID with caching
   * @param id Project ID
   * @returns Project or null
   */
  async findById(id: UUID): Promise<Project | null> {
    // Check cache first
    const cached = await this.redis.get(`${CACHE_PREFIX}${id}`);
    if (cached) {
      this.logger.debug('Project cache hit', { id });
      return JSON.parse(cached);
    }

    // Query database
    const project = await this.prisma.project.findUnique({
      where: { 
        id,
        deletedAt: null
      },
      include: {
        teamMembers: {
          where: { deletedAt: null },
          include: { user: true }
        },
        owner: true
      }
    });

    // Cache result if found
    if (project) {
      await this.redis.setex(
        `${CACHE_PREFIX}${id}`,
        CACHE_TTL,
        JSON.stringify(project)
      );
    }

    return project;
  }

  /**
   * Retrieves projects with advanced filtering and caching
   * @param params Query parameters
   * @returns Paginated project list
   */
  async findAll(params: ProjectQueryParams): Promise<{ data: Project[]; total: number }> {
    const {
      status,
      priority,
      ownerId,
      teamMemberId,
      startDate,
      endDate,
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // Build where clause
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(ownerId && { ownerId }),
      ...(teamMemberId && {
        teamMembers: {
          some: {
            userId: teamMemberId,
            deletedAt: null
          }
        }
      }),
      ...(startDate && { startDate: { gte: startDate } }),
      ...(endDate && { endDate: { lte: endDate } })
    };

    // Execute count query
    const total = await this.prisma.project.count({ where });

    // Execute paginated query
    const data = await this.prisma.project.findMany({
      where,
      include: {
        teamMembers: {
          where: { deletedAt: null },
          include: { user: true }
        },
        owner: true
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    });

    return { data, total };
  }

  /**
   * Invalidates project-related cache entries
   * @param projectId Project ID
   */
  private async invalidateProjectCache(projectId: UUID): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX}${projectId}`);
    await this.redis.del(`${CACHE_PREFIX}list`);
  }
}