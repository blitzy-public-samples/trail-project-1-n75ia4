/**
 * @fileoverview Project-related Data Transfer Objects (DTOs) with comprehensive validation
 * @version 1.0.0
 * @module dto/project
 */

// External imports - versions specified for security compliance
import {
  IsString, IsNotEmpty, IsEnum, IsUUID, IsDate, IsOptional,
  IsArray, ValidateNested, Length, Min, Max, IsIn,
  ValidateIf
} from 'class-validator'; // ^0.14.0
import { Expose, Type, Transform } from 'class-transformer'; // ^0.5.1
import { ApiProperty } from '@nestjs/swagger'; // ^10.0.0

// Internal imports
import { ProjectStatus, ProjectPriority } from '../types/project.types';
import {
  validateProjectStatus,
  validatePriority,
  validateDate,
  validateUUID,
  sanitizeInput
} from '../utils/validation.util';

/**
 * DTO for project creation with comprehensive validation and sanitization
 */
export class CreateProjectDTO {
  @ApiProperty({
    description: 'Project name',
    minLength: 3,
    maxLength: 100,
    example: 'Enterprise Web Application'
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Transform(({ value }) => sanitizeInput(value))
  name: string;

  @ApiProperty({
    description: 'Project description',
    minLength: 10,
    maxLength: 2000,
    example: 'Development of enterprise-grade web application with React and Node.js'
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  @Transform(({ value }) => sanitizeInput(value))
  description: string;

  @ApiProperty({
    description: 'Project priority level',
    enum: ProjectPriority,
    example: ProjectPriority.HIGH
  })
  @IsEnum(ProjectPriority)
  @Transform(({ value }) => value.toUpperCase())
  @ValidateIf((_, value) => validatePriority(value, 'project'))
  priority: ProjectPriority;

  @ApiProperty({
    description: 'Project start date',
    type: Date,
    example: '2024-01-01'
  })
  @IsDate()
  @Type(() => Date)
  @ValidateIf((_, value) => validateDate(value))
  startDate: Date;

  @ApiProperty({
    description: 'Project end date',
    type: Date,
    example: '2024-12-31'
  })
  @IsDate()
  @Type(() => Date)
  @ValidateIf((_, value) => validateDate(value))
  endDate: Date;

  @ApiProperty({
    description: 'Array of team member UUIDs',
    type: [String],
    example: ['uuid1', 'uuid2']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ValidateIf((_, value) => value.every((id: string) => validateUUID(id)))
  @Transform(({ value }) => Array.from(new Set(value))) // Remove duplicates
  teamMembers: string[];

  /**
   * Custom validator to ensure startDate is before endDate
   */
  @ValidateIf(o => o.startDate && o.endDate)
  validateDates(): boolean {
    return this.startDate < this.endDate;
  }
}

/**
 * DTO for project updates with partial validation
 */
export class UpdateProjectDTO {
  @ApiProperty({
    description: 'Project name',
    minLength: 3,
    maxLength: 100,
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(3, 100)
  @Transform(({ value }) => sanitizeInput(value))
  name?: string;

  @ApiProperty({
    description: 'Project description',
    minLength: 10,
    maxLength: 2000,
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(10, 2000)
  @Transform(({ value }) => sanitizeInput(value))
  description?: string;

  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  @Transform(({ value }) => value.toUpperCase())
  @ValidateIf((_, value) => validateProjectStatus(value))
  status?: ProjectStatus;

  @ApiProperty({
    description: 'Project priority',
    enum: ProjectPriority,
    required: false
  })
  @IsOptional()
  @IsEnum(ProjectPriority)
  @Transform(({ value }) => value.toUpperCase())
  @ValidateIf((_, value) => validatePriority(value, 'project'))
  priority?: ProjectPriority;

  @ApiProperty({
    description: 'Project start date',
    type: Date,
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ValidateIf((_, value) => validateDate(value))
  startDate?: Date;

  @ApiProperty({
    description: 'Project end date',
    type: Date,
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ValidateIf((_, value) => validateDate(value))
  endDate?: Date;

  @ApiProperty({
    description: 'Array of team member UUIDs',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ValidateIf((_, value) => value.every((id: string) => validateUUID(id)))
  @Transform(({ value }) => Array.from(new Set(value)))
  teamMembers?: string[];

  /**
   * Custom validator for partial date updates
   */
  @ValidateIf(o => o.startDate || o.endDate)
  validatePartialDates(): boolean {
    if (this.startDate && this.endDate) {
      return this.startDate < this.endDate;
    }
    return true;
  }
}

/**
 * DTO for project queries with pagination and sorting
 */
export class ProjectQueryDTO {
  @ApiProperty({
    description: 'Filter by project status',
    enum: ProjectStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  @Transform(({ value }) => value.toUpperCase())
  status?: ProjectStatus;

  @ApiProperty({
    description: 'Filter by project priority',
    enum: ProjectPriority,
    required: false
  })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiProperty({
    description: 'Filter by owner UUID',
    required: false
  })
  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @ApiProperty({
    description: 'Filter by team member UUID',
    required: false
  })
  @IsOptional()
  @IsUUID('4')
  teamMemberId?: string;

  @ApiProperty({
    description: 'Filter by start date',
    type: Date,
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'Filter by end date',
    type: Date,
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10
  })
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Field to sort by',
    enum: ['name', 'startDate', 'endDate', 'priority', 'status'],
    default: 'startDate'
  })
  @IsOptional()
  @IsIn(['name', 'startDate', 'endDate', 'priority', 'status'])
  sortBy?: string = 'startDate';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  /**
   * Custom validator for query parameters
   */
  @ValidateIf(o => o.page || o.limit)
  validateQueryParams(): boolean {
    // Validate pagination
    if (this.page && this.page < 1) return false;
    if (this.limit && (this.limit < 1 || this.limit > 100)) return false;
    
    // Validate date range if both dates are present
    if (this.startDate && this.endDate) {
      return this.startDate <= this.endDate;
    }
    
    return true;
  }
}