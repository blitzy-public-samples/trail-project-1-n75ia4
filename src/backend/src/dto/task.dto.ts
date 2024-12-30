/**
 * @fileoverview Data Transfer Object (DTO) classes for task-related operations
 * @version 1.0.0
 * @module dto/task
 * 
 * This module implements comprehensive validation, sanitization, and type safety
 * for task data in the enterprise task management system, following OWASP security
 * requirements and enterprise standards.
 */

// External imports - versions specified for security compliance
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsDate,
  IsOptional,
  Length,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  Matches
} from 'class-validator'; // ^0.14.0

import {
  Expose,
  Type,
  Transform
} from 'class-transformer'; // ^0.5.1

// Internal imports
import { TaskStatus, TaskPriority, Task } from '../types/task.types';
import {
  validateUUID,
  validateTaskStatus,
  validatePriority,
  validateDate,
  sanitizeInput
} from '../utils/validation.util';

/**
 * DTO class for task creation requests with comprehensive validation and sanitization
 * Implements strict input validation following enterprise security standards
 */
@ValidateNested()
@Transform(({ value }) => sanitizeInput(value))
export class CreateTaskDTO {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @Length(1, 100, { message: 'Title must be between 1 and 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, { message: 'Title contains invalid characters' })
  @Expose()
  @Transform(({ value }) => sanitizeInput(value))
  title: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @Length(0, 1000, { message: 'Description must not exceed 1000 characters' })
  @Expose()
  @Transform(({ value }) => sanitizeInput(value))
  description?: string;

  @IsEnum(TaskPriority, { message: 'Invalid priority value' })
  @IsNotEmpty({ message: 'Priority is required' })
  @Expose()
  priority: TaskPriority;

  @IsUUID('4', { message: 'Invalid assignee ID format' })
  @IsNotEmpty({ message: 'Assignee ID is required' })
  @Expose()
  assigneeId: string;

  @IsUUID('4', { message: 'Invalid project ID format' })
  @IsNotEmpty({ message: 'Project ID is required' })
  @Expose()
  projectId: string;

  @IsDate({ message: 'Invalid date format' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'Due date is required' })
  @Expose()
  dueDate: Date;
}

/**
 * DTO class for task update requests with partial update support and validation
 * Implements flexible update operations with comprehensive validation
 */
@ValidateNested()
@Transform(({ value }) => sanitizeInput(value))
export class UpdateTaskDTO {
  @IsString({ message: 'Title must be a string' })
  @IsOptional()
  @Length(1, 100, { message: 'Title must be between 1 and 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, { message: 'Title contains invalid characters' })
  @Expose()
  @Transform(({ value }) => sanitizeInput(value))
  title?: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @Length(0, 1000, { message: 'Description must not exceed 1000 characters' })
  @Expose()
  @Transform(({ value }) => sanitizeInput(value))
  description?: string;

  @IsEnum(TaskStatus, { message: 'Invalid status value' })
  @IsOptional()
  @Expose()
  status?: TaskStatus;

  @IsEnum(TaskPriority, { message: 'Invalid priority value' })
  @IsOptional()
  @Expose()
  priority?: TaskPriority;

  @IsUUID('4', { message: 'Invalid assignee ID format' })
  @IsOptional()
  @Expose()
  assigneeId?: string;

  @IsDate({ message: 'Invalid date format' })
  @Type(() => Date)
  @IsOptional()
  @Expose()
  dueDate?: Date;
}

/**
 * DTO class for task query parameters with advanced filtering and pagination
 * Implements comprehensive search and filter capabilities
 */
@ValidateNested()
@Transform(({ value }) => sanitizeInput(value))
export class TaskQueryDTO {
  @IsEnum(TaskStatus, { message: 'Invalid status value' })
  @IsOptional()
  @Expose()
  status?: TaskStatus;

  @IsEnum(TaskPriority, { message: 'Invalid priority value' })
  @IsOptional()
  @Expose()
  priority?: TaskPriority;

  @IsUUID('4', { message: 'Invalid assignee ID format' })
  @IsOptional()
  @Expose()
  assigneeId?: string;

  @IsUUID('4', { message: 'Invalid project ID format' })
  @IsOptional()
  @Expose()
  projectId?: string;

  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be greater than 0' })
  @IsOptional()
  @Type(() => Number)
  @Expose()
  page?: number;

  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(100, { message: 'Limit must not exceed 100' })
  @IsOptional()
  @Type(() => Number)
  @Expose()
  limit?: number;

  @IsString({ message: 'Sort field must be a string' })
  @IsOptional()
  @Matches(/^[a-zA-Z_]+$/, { message: 'Invalid sort field' })
  @Expose()
  sortBy?: string;

  @IsString({ message: 'Sort order must be a string' })
  @IsOptional()
  @Matches(/^(ASC|DESC)$/i, { message: 'Sort order must be ASC or DESC' })
  @Expose()
  sortOrder?: string;

  @IsString({ message: 'Search query must be a string' })
  @IsOptional()
  @Length(0, 100, { message: 'Search query too long' })
  @Transform(({ value }) => sanitizeInput(value))
  @Expose()
  search?: string;
}