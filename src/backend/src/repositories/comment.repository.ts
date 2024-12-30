/**
 * @fileoverview Enterprise-grade repository implementation for comment management
 * @version 1.0.0
 * @module repositories/comment
 */

// External imports
import { Injectable } from '@nestjs/common'; // v10.0.0
import { PrismaClient } from '@prisma/client'; // v5.0.0
import { CACHE_MANAGER } from '@nestjs/cache-manager'; // v2.0.0
import { Logger } from '@nestjs/common'; // v10.0.0
import { UUID } from 'crypto';

// Internal imports
import { Comment } from '../models/comment.model';

/**
 * Interface for comment query options with pagination and filtering
 */
interface CommentQueryOptions {
  page: number;
  limit: number;
  sortBy?: keyof Comment;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

/**
 * Interface for paginated comment response
 */
interface PaginatedComments {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  TTL: 3600, // 1 hour
  PREFIX: 'comment:',
};

/**
 * Enterprise-grade repository class for comment management with advanced features
 * including caching, transactions, audit trails, and optimized querying
 */
@Injectable()
export class CommentRepository {
  private readonly logger = new Logger(CommentRepository.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager: typeof CACHE_MANAGER
  ) {}

  /**
   * Creates a new comment with transaction support and validation
   * @param data Comment creation data
   * @returns Created comment instance
   */
  async create(data: {
    content: string;
    taskId: UUID;
    authorId: UUID;
    mentions?: string[];
    attachments?: string[];
  }): Promise<Comment> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Validate task existence
        const task = await tx.task.findUnique({
          where: { id: data.taskId }
        });

        if (!task) {
          throw new Error('Referenced task does not exist');
        }

        // Create comment
        const comment = await tx.comment.create({
          data: {
            content: data.content,
            taskId: data.taskId,
            authorId: data.authorId,
            mentions: data.mentions || [],
            attachments: data.attachments || [],
            version: 1,
            isModerated: false
          }
        });

        // Create audit trail
        await tx.commentAuditLog.create({
          data: {
            commentId: comment.id,
            action: 'CREATE',
            userId: data.authorId,
            changes: comment
          }
        });

        // Invalidate related caches
        await this.invalidateCache(comment.taskId);

        this.logger.log(`Comment created: ${comment.id}`);
        return comment;
      });
    } catch (error) {
      this.logger.error('Comment creation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieves a comment by ID with caching
   * @param id Comment identifier
   * @returns Comment instance or null if not found
   */
  async findById(id: UUID): Promise<Comment | null> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_CONFIG.PREFIX}${id}`;
      const cached = await this.cacheManager.get<Comment>(cacheKey);

      if (cached) {
        return cached;
      }

      // Query database if cache miss
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (comment) {
        // Cache the result
        await this.cacheManager.set(cacheKey, comment, CACHE_CONFIG.TTL);
      }

      return comment;
    } catch (error) {
      this.logger.error(`Failed to find comment by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all comments for a task with advanced filtering and pagination
   * @param taskId Task identifier
   * @param options Query options
   * @returns Paginated comments with metadata
   */
  async findByTaskId(
    taskId: UUID,
    options: CommentQueryOptions
  ): Promise<PaginatedComments> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeDeleted = false
      } = options;

      const where = {
        taskId,
        isModerated: includeDeleted ? undefined : false
      };

      const [items, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        this.prisma.comment.count({ where })
      ]);

      return {
        items,
        total,
        page,
        limit,
        hasMore: total > page * limit
      };
    } catch (error) {
      this.logger.error(`Failed to find comments for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Updates a comment with optimistic locking and validation
   * @param id Comment identifier
   * @param data Update data
   * @returns Updated comment instance
   */
  async update(
    id: UUID,
    data: {
      content?: string;
      mentions?: string[];
      attachments?: string[];
      version: number;
    }
  ): Promise<Comment> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Check version for optimistic locking
        const currentComment = await tx.comment.findUnique({
          where: { id }
        });

        if (!currentComment) {
          throw new Error('Comment not found');
        }

        if (currentComment.version !== data.version) {
          throw new Error('Comment has been modified by another operation');
        }

        const comment = await tx.comment.update({
          where: { id },
          data: {
            ...data,
            version: {
              increment: 1
            },
            updatedAt: new Date()
          }
        });

        // Create audit trail
        await tx.commentAuditLog.create({
          data: {
            commentId: id,
            action: 'UPDATE',
            userId: currentComment.authorId,
            changes: {
              previous: currentComment,
              current: comment
            }
          }
        });

        // Invalidate cache
        await this.invalidateCache(comment.taskId);

        this.logger.log(`Comment updated: ${id}`);
        return comment;
      });
    } catch (error) {
      this.logger.error(`Failed to update comment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft deletes a comment with audit trail
   * @param id Comment identifier
   */
  async delete(id: UUID): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const comment = await tx.comment.update({
          where: { id },
          data: {
            isModerated: true,
            content: '[Comment removed]',
            mentions: [],
            attachments: []
          }
        });

        // Create audit trail
        await tx.commentAuditLog.create({
          data: {
            commentId: id,
            action: 'DELETE',
            userId: comment.authorId,
            changes: comment
          }
        });

        // Invalidate cache
        await this.invalidateCache(comment.taskId);

        this.logger.log(`Comment deleted: ${id}`);
      });
    } catch (error) {
      this.logger.error(`Failed to delete comment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to invalidate comment caches
   * @param taskId Task identifier
   */
  private async invalidateCache(taskId: UUID): Promise<void> {
    try {
      const patterns = [
        `${CACHE_CONFIG.PREFIX}*`,
        `task:${taskId}:comments*`
      ];

      await Promise.all(
        patterns.map(pattern => this.cacheManager.del(pattern))
      );
    } catch (error) {
      this.logger.warn('Cache invalidation failed:', error);
    }
  }
}

export default CommentRepository;