/**
 * @fileoverview Central export file for all Data Transfer Objects (DTOs)
 * @version 1.0.0
 * @module dto
 * 
 * This module serves as the central export point for all DTOs used in the task management system.
 * It implements a comprehensive type-safe data validation layer following OWASP security requirements
 * and enterprise coding standards.
 */

// Authentication DTOs
export {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto
} from './auth.dto';

// Project Management DTOs
export {
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectQueryDTO
} from './project.dto';

// Task Management DTOs
export {
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskQueryDTO
} from './task.dto';

// User Management DTOs
export {
  CreateUserDTO,
  UpdateUserDTO,
  UserPreferencesDTO,
  NotificationPreferencesDTO,
  UserQueryDTO
} from './user.dto';

/**
 * @remarks
 * This file centralizes all DTO exports to provide a single import point for data validation
 * and transfer structures. All DTOs implement comprehensive validation following OWASP guidelines
 * and include:
 * - Input sanitization
 * - Type validation
 * - Security checks
 * - Schema compliance
 * 
 * Version compatibility:
 * - class-validator: ^0.14.0
 * - class-transformer: ^0.5.1
 * - @nestjs/swagger: ^10.0.0
 */