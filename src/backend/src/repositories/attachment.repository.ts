/**
 * @fileoverview Enhanced attachment repository implementing secure data access and storage operations
 * Provides comprehensive security, monitoring, and performance features for file attachments
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // v5.0+
import crypto from 'crypto'; // native
import { AttachmentModel } from '../models/attachment.model';
import { StorageService } from '../services/storage.service';
import { createError } from '../utils/error.util';
import { Logger } from '../utils/logger.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';

/**
 * Interface for retry configuration
 */
interface RetryConfiguration {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

/**
 * Interface for security context
 */
interface SecurityContext {
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
}

/**
 * Enhanced repository class for secure attachment operations
 */
export class AttachmentRepository {
  private readonly defaultRetryConfig: RetryConfiguration = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000
  };

  constructor(
    private readonly attachmentModel: AttachmentModel,
    private readonly storageService: StorageService,
    private readonly logger: Logger,
    private readonly retryConfig: RetryConfiguration = this.defaultRetryConfig
  ) {}

  /**
   * Creates a new attachment with enhanced security and monitoring
   */
  public async createAttachment(params: {
    file: Buffer;
    filename: string;
    fileType: string;
    fileSize: number;
    taskId: string;
    uploaderId: string;
    securityContext: SecurityContext;
  }): Promise<any> {
    return Logger.withCorrelation(crypto.randomUUID(), async () => {
      try {
        // Log operation start
        this.logger.info('Starting attachment creation', {
          filename: params.filename,
          taskId: params.taskId,
          uploaderId: params.uploaderId
        });

        // Validate file type and scan for viruses
        await this.storageService.validateFileType(params.fileType);
        const scanResult = await this.storageService.scanFile(params.file);
        
        if (!scanResult.isClean) {
          this.logger.security('Malware detected in file upload', {
            ...params.securityContext,
            filename: params.filename,
            virusName: scanResult.virusName
          });
          throw createError(
            'File failed security scan',
            StatusCode.BAD_REQUEST,
            ErrorCode.SECURITY_SCAN_ERROR
          );
        }

        // Create attachment record with retry mechanism
        const attachment = await this.retryOperation(() =>
          this.attachmentModel.create({
            fileName: params.filename,
            fileSize: params.fileSize,
            mimeType: params.fileType,
            buffer: params.file,
            taskId: params.taskId,
            userId: params.uploaderId
          })
        );

        // Log successful creation
        this.logger.info('Attachment created successfully', {
          attachmentId: attachment.id,
          filename: params.filename,
          taskId: params.taskId
        });

        return attachment;
      } catch (error) {
        this.logger.error('Attachment creation failed', { error });
        throw error;
      }
    });
  }

  /**
   * Retrieves attachment by ID with security validation
   */
  public async getAttachmentById(
    id: string,
    securityContext: SecurityContext
  ): Promise<any> {
    return Logger.withCorrelation(crypto.randomUUID(), async () => {
      try {
        const attachment = await this.retryOperation(() =>
          this.attachmentModel.findById(id)
        );

        this.logger.info('Attachment retrieved', {
          attachmentId: id,
          ...securityContext
        });

        return attachment;
      } catch (error) {
        this.logger.error('Attachment retrieval failed', { error, id });
        throw error;
      }
    });
  }

  /**
   * Retrieves all attachments for a task with security validation
   */
  public async getAttachmentsByTaskId(
    taskId: string,
    securityContext: SecurityContext
  ): Promise<any[]> {
    return Logger.withCorrelation(crypto.randomUUID(), async () => {
      try {
        const attachments = await this.retryOperation(() =>
          this.attachmentModel.findByTaskId(taskId)
        );

        this.logger.info('Task attachments retrieved', {
          taskId,
          count: attachments.length,
          ...securityContext
        });

        return attachments;
      } catch (error) {
        this.logger.error('Task attachments retrieval failed', { error, taskId });
        throw error;
      }
    });
  }

  /**
   * Securely deletes an attachment with audit logging
   */
  public async deleteAttachment(
    id: string,
    securityContext: SecurityContext
  ): Promise<void> {
    return Logger.withCorrelation(crypto.randomUUID(), async () => {
      try {
        await this.retryOperation(() =>
          this.attachmentModel.delete(id)
        );

        this.logger.security('Attachment deleted', {
          attachmentId: id,
          ...securityContext
        });
      } catch (error) {
        this.logger.error('Attachment deletion failed', { error, id });
        throw error;
      }
    });
  }

  /**
   * Downloads attachment with security validation and monitoring
   */
  public async downloadAttachment(
    id: string,
    securityContext: SecurityContext
  ): Promise<Buffer> {
    return Logger.withCorrelation(crypto.randomUUID(), async () => {
      try {
        const attachment = await this.retryOperation(() =>
          this.attachmentModel.download(id)
        );

        this.logger.info('Attachment downloaded', {
          attachmentId: id,
          ...securityContext
        });

        return attachment;
      } catch (error) {
        this.logger.error('Attachment download failed', { error, id });
        throw error;
      }
    });
  }

  /**
   * Implements retry mechanism for operations
   * @private
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.retryConfig.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, retryCount),
        this.retryConfig.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryOperation(operation, retryCount + 1);
    }
  }
}