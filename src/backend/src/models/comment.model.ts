/**
 * @fileoverview Enterprise-grade comment model implementation with real-time features
 * @version 1.0.0
 * @module models/comment
 */

// External imports
import { PrismaClient, Prisma } from '@prisma/client'; // v5.0.0
import { UUID, randomUUID } from 'crypto';
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { createHash } from 'crypto';

// Internal imports
import { Task } from './task.model';
import { User } from './user.model';

/**
 * Interface for comment creation data
 */
interface CreateCommentDTO {
  content: string;
  taskId: UUID;
  authorId: UUID;
  mentions?: string[];
  attachments?: string[];
}

/**
 * Interface for comment update data
 */
interface UpdateCommentDTO {
  content?: string;
  mentions?: string[];
  attachments?: string[];
  version: number; // For optimistic locking
}

/**
 * Configuration for content sanitization
 */
const SANITIZE_OPTIONS = {
  allowedTags: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href']
  },
  allowedSchemes: ['http', 'https']
};

/**
 * Enhanced comment model class implementing Prisma operations with security features
 */
export class CommentModel {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates a new comment with content sanitization and validation
   * @param data Comment creation data
   * @returns Created comment instance
   */
  async createComment(data: CreateCommentDTO): Promise<Comment> {
    try {
      // Sanitize content
      const sanitizedContent = sanitizeHtml(data.content, SANITIZE_OPTIONS);

      // Generate content hash for duplicate detection
      const contentHash = this.generateContentHash(sanitizedContent);

      return await this.prisma.$transaction(async (tx) => {
        // Check for task existence
        const task = await tx.task.findUnique({
          where: { id: data.taskId }
        });

        if (!task) {
          throw new Error('Referenced task does not exist');
        }

        // Check for duplicate comment content
        const existingComment = await tx.comment.findUnique({
          where: { contentHash }
        });

        if (existingComment) {
          throw new Error('Duplicate comment detected');
        }

        // Create comment
        const comment = await tx.comment.create({
          data: {
            id: randomUUID(),
            content: sanitizedContent,
            taskId: data.taskId,
            authorId: data.authorId,
            mentions: data.mentions || [],
            attachments: data.attachments || [],
            contentHash,
            version: 1,
            isModerated: false
          }
        });

        // Create audit log entry
        await tx.commentAuditLog.create({
          data: {
            commentId: comment.id,
            action: 'CREATE',
            userId: data.authorId,
            changes: comment
          }
        });

        return comment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Updates comment with optimistic locking and validation
   * @param id Comment identifier
   * @param data Update data
   * @param userId User performing the update
   * @returns Updated comment instance
   */
  async updateComment(
    id: UUID,
    data: UpdateCommentDTO,
    userId: UUID
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

        // Sanitize content if provided
        const sanitizedContent = data.content 
          ? sanitizeHtml(data.content, SANITIZE_OPTIONS)
          : undefined;

        // Generate new content hash if content is updated
        const contentHash = sanitizedContent 
          ? this.generateContentHash(sanitizedContent)
          : undefined;

        const comment = await tx.comment.update({
          where: { id },
          data: {
            content: sanitizedContent,
            mentions: data.mentions,
            attachments: data.attachments,
            contentHash,
            isEdited: true,
            version: {
              increment: 1
            },
            updatedAt: new Date()
          }
        });

        // Create audit log entry
        await tx.commentAuditLog.create({
          data: {
            commentId: id,
            action: 'UPDATE',
            userId,
            changes: {
              previous: currentComment,
              current: comment
            }
          }
        });

        return comment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Retrieves comments for a task with pagination
   * @param taskId Task identifier
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated comment results
   */
  async getTaskComments(
    taskId: UUID,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    items: Comment[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const [items, total] = await Promise.all([
        this.prisma.comment.findMany({
          where: { taskId },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          },
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
        this.prisma.comment.count({
          where: { taskId }
        })
      ]);

      return {
        items,
        total,
        hasMore: total > page * limit
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Soft deletes a comment
   * @param id Comment identifier
   * @param userId User performing the deletion
   */
  async deleteComment(id: UUID, userId: UUID): Promise<void> {
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

        // Create audit log entry
        await tx.commentAuditLog.create({
          data: {
            commentId: id,
            action: 'DELETE',
            userId,
            changes: comment
          }
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generates a unique hash for comment content
   * @param content Comment content
   * @returns Content hash
   */
  private generateContentHash(content: string): string {
    return createHash('sha256')
      .update(content.toLowerCase().trim())
      .digest('hex');
  }
}

/**
 * Prisma model definition for Comment entity
 */
export const Comment = Prisma.validator<Prisma.CommentDefaultArgs>()({
  model: 'Comment',
  fields: {
    id: true,
    content: true,
    taskId: true,
    authorId: true,
    createdAt: true,
    updatedAt: true,
    isEdited: true,
    mentions: true,
    attachments: true,
    contentHash: true,
    isModerated: true,
    version: true
  }
});

export type Comment = Prisma.CommentGetPayload<typeof Comment>;

export default CommentModel;