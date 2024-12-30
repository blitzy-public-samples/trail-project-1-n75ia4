/**
 * @fileoverview Data Transfer Object definitions for user-related operations
 * @version 1.0.0
 * @module dto/user
 *
 * Implements comprehensive DTOs for user management with strict validation
 * and security measures following OWASP guidelines.
 */

// External imports - versions specified for security compliance
import {
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
  Matches,
  Length,
} from 'class-validator'; // ^0.14.0
import { Type, Transform } from 'class-transformer'; // ^0.5.1

// Internal imports
import {
  UserRole,
  UserStatus,
  UserPreferences,
  NotificationPreferences
} from '../types/user.types';
import {
  validateEmail,
  validateUserRole,
  sanitizeInput
} from '../utils/validation.util';

/**
 * DTO for notification preferences with validation
 */
export class NotificationPreferencesDTO implements NotificationPreferences {
  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  email: boolean = true;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  inApp: boolean = true;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  taskUpdates: boolean = true;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  projectUpdates: boolean = true;
}

/**
 * DTO for user preferences with validation
 */
export class UserPreferencesDTO implements UserPreferences {
  @IsOptional()
  @IsNotEmpty({ message: 'Theme cannot be empty when provided' })
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message: 'Theme must contain only alphanumeric characters, hyphens, and underscores'
  })
  @Length(2, 50, { message: 'Theme must be between 2 and 50 characters' })
  @Transform(({ value }) => sanitizeInput(value))
  theme: string = 'light';

  @IsOptional()
  @IsNotEmpty({ message: 'Language cannot be empty when provided' })
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, {
    message: 'Language must be in format: xx-XX (e.g., en-US)'
  })
  language: string = 'en-US';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDTO)
  notifications: NotificationPreferences = new NotificationPreferencesDTO();
}

/**
 * DTO for creating new users with enhanced validation
 */
export class CreateUserDTO {
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Email format is invalid'
  })
  email: string;

  @IsNotEmpty({ message: 'Name is required' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  @Matches(/^[a-zA-Z0-9\s-']+$/, {
    message: 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'
  })
  @Transform(({ value }) => sanitizeInput(value))
  name: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Invalid user role' })
  @Transform(({ value }) => value?.toUpperCase())
  role: UserRole;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDTO)
  preferences: UserPreferences = new UserPreferencesDTO();
}

/**
 * DTO for updating existing users with validation
 */
export class UpdateUserDTO {
  @IsOptional()
  @IsNotEmpty({ message: 'Name cannot be empty when provided' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  @Matches(/^[a-zA-Z0-9\s-']+$/, {
    message: 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'
  })
  @Transform(({ value }) => sanitizeInput(value))
  name?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  @Transform(({ value }) => value?.toUpperCase())
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  @Transform(({ value }) => value?.toUpperCase())
  status?: UserStatus;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDTO)
  preferences?: UserPreferences;
}

/**
 * DTO for user query parameters with validation
 */
export class UserQueryDTO {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status?: UserStatus;

  @IsOptional()
  @Length(0, 100, { message: 'Search query cannot exceed 100 characters' })
  @Transform(({ value }) => sanitizeInput(value))
  search?: string;

  @IsOptional()
  @Min(1, { message: 'Page must be greater than 0' })
  @Transform(({ value }) => parseInt(value) || 1)
  page: number = 1;

  @IsOptional()
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value) || 10)
  limit: number = 10;

  @IsOptional()
  @Matches(/^[a-zA-Z_]+$/, { message: 'Sort field must contain only letters and underscores' })
  @Transform(({ value }) => sanitizeInput(value))
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder: 'asc' | 'desc' = 'desc';
}