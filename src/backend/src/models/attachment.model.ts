/**
 * @fileoverview Enhanced attachment model with comprehensive security and monitoring features
 * Implements secure file handling, virus scanning, and audit logging for the task management system
 * @version 1.0.0
 */

import { PrismaClient, Attachment } from '@prisma/client'; // v5.0+
import { StorageService } from '../services/storage.service';
import * as clamav from 'clamav.js'; // v1.0+
import winston from 'winston'; // v3.0+
import { AppError } from '../utils/error.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';

/**
 * Interface for attachment creation input
 */
interface AttachmentCreateInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  buffer: Buffer;
  taskId: string;
  userId: string;
  projectId?: string;
}

/**
 * Interface for bulk upload result
 */
interface BulkUploadResult {
  successful: Attachment[];
  failed: Array<{
    fileName: string;
    error: string;
  }>;
}

/**
 * Enhanced model class for secure file attachment handling
 */
export class AttachmentModel {
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip'
  ];

  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storageService: StorageService,
    private readonly logger: winston.Logger,
    private readonly virusScanner: typeof clamav
  ) {
    // Initialize virus scanner
    this.initializeVirusScanner();
  }

  /**
   * Initializes virus scanner with security configurations
   * @private
   */
  private async initializeVirusScanner(): Promise<void> {
    try {
      await this.virusScanner.init({
        removeInfected: true,
        quarantinePath: '/var/quarantine',
        debugMode: process.env.NODE_ENV === 'development',
        fileLogPath: '/var/log/clamav/scan.log'
      });
    } catch (error) {
      this.logger.error('Virus scanner initialization failed', { error });
      throw new AppError(
        'Security service initialization failed',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Validates file metadata and content
   * @private
   */
  private validateFile(file: AttachmentCreateInput): void {
    // Check file size
    if (file.fileSize > AttachmentModel.MAX_FILE_SIZE) {
      throw new AppError(
        'File size exceeds maximum limit',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Validate mime type
    if (!AttachmentModel.ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      throw new AppError(
        'File type not allowed',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Validate file name
    if (!/^[\w\-. ]+$/.test(file.fileName)) {
      throw new AppError(
        'Invalid file name',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * Scans file for viruses and malware
   * @private
   */
  private async scanFile(buffer: Buffer): Promise<boolean> {
    try {
      const scanResult = await this.virusScanner.scanBuffer(buffer);
      if (!scanResult.isClean) {
        this.logger.security('Malware detected in uploaded file', {
          virusName: scanResult.viruses,
          action: 'FILE_UPLOAD',
          status: 'BLOCKED'
        });
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Virus scan failed', { error });
      throw new AppError(
        'Security scan failed',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.SECURITY_SCAN_ERROR
      );
    }
  }

  /**
   * Creates a new attachment with enhanced security and monitoring
   */
  public async create(data: AttachmentCreateInput): Promise<Attachment> {
    try {
      // Validate file metadata
      this.validateFile(data);

      // Scan file for viruses
      const isClean = await this.scanFile(data.buffer);
      if (!isClean) {
        throw new AppError(
          'File failed security scan',
          StatusCode.BAD_REQUEST,
          ErrorCode.SECURITY_SCAN_ERROR
        );
      }

      // Upload file to storage
      const fileKey = await this.storageService.uploadFile(
        data.buffer,
        data.fileName,
        data.mimeType,
        {
          userId: data.userId,
          projectId: data.projectId,
          originalName: data.fileName,
          size: data.fileSize,
          contentType: data.mimeType
        }
      );

      // Create attachment record
      const attachment = await this.prisma.attachment.create({
        data: {
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          fileKey,
          taskId: data.taskId,
          uploadedBy: data.userId,
          projectId: data.projectId
        }
      });

      // Log successful upload
      this.logger.info('Attachment created successfully', {
        attachmentId: attachment.id,
        fileName: data.fileName,
        taskId: data.taskId
      });

      return attachment;
    } catch (error) {
      this.logger.error('Attachment creation failed', { error });
      throw error instanceof AppError ? error : new AppError(
        'Attachment creation failed',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves attachment with access logging
   */
  public async findById(id: string): Promise<Attachment> {
    try {
      const attachment = await this.prisma.attachment.findUnique({
        where: { id }
      });

      if (!attachment) {
        throw new AppError(
          'Attachment not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND
        );
      }

      this.logger.info('Attachment accessed', {
        attachmentId: id,
        fileName: attachment.fileName
      });

      return attachment;
    } catch (error) {
      this.logger.error('Attachment retrieval failed', { error, id });
      throw error instanceof AppError ? error : new AppError(
        'Attachment retrieval failed',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Securely deletes attachment with audit trail
   */
  public async delete(id: string): Promise<void> {
    try {
      const attachment = await this.findById(id);

      // Delete from storage
      await this.storageService.deleteFile(attachment.fileKey);

      // Delete database record
      await this.prisma.attachment.delete({
        where: { id }
      });

      this.logger.info('Attachment deleted successfully', {
        attachmentId: id,
        fileName: attachment.fileName
      });
    } catch (error) {
      this.logger.error('Attachment deletion failed', { error, id });
      throw error instanceof AppError ? error : new AppError(
        'Attachment deletion failed',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Handles multiple file uploads securely
   */
  public async bulkUpload(files: AttachmentCreateInput[]): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      successful: [],
      failed: []
    };

    await Promise.all(files.map(async (file) => {
      try {
        const attachment = await this.create(file);
        result.successful.push(attachment);
      } catch (error) {
        result.failed.push({
          fileName: file.fileName,
          error: error instanceof AppError ? error.message : 'Upload failed'
        });
      }
    }));

    this.logger.info('Bulk upload completed', {
      totalFiles: files.length,
      successful: result.successful.length,
      failed: result.failed.length
    });

    return result;
  }
}