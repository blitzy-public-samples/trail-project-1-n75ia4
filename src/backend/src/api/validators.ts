/**
 * @fileoverview Centralized validation middleware and functions for API request validation
 * @version 1.0.0
 * @module api/validators
 * 
 * Implements comprehensive input validation, sanitization, and type checking for all API
 * endpoints with enhanced security measures and OWASP compliance.
 */

// External imports with specified versions for security compliance
import { validate, validateOrReject } from 'class-validator'; // ^0.14.0
import { plainToClass } from 'class-transformer'; // ^0.5.1
import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { RateLimiter } from 'rate-limiter-flexible'; // ^2.4.1

// Internal imports
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto/auth.dto';
import { CreateProjectDTO, UpdateProjectDTO, ProjectQueryDTO } from '../dto/project.dto';
import { CreateTaskDTO, UpdateTaskDTO, TaskQueryDTO } from '../dto/task.dto';
import { ValidationUtils } from '../utils/validation.util';

// Configure rate limiter for API security
const rateLimiter = new RateLimiter({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 120 // Block for 2 minutes if exceeded
});

/**
 * Error response interface for consistent error handling
 */
interface ValidationErrorResponse {
  status: 'error';
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Formats validation errors into a standardized response
 * @param errors - Array of validation errors
 * @returns Formatted error response
 */
const formatValidationErrors = (errors: any[]): ValidationErrorResponse => {
  const formattedErrors: Record<string, string[]> = {};
  
  errors.forEach(error => {
    if (error.constraints) {
      formattedErrors[error.property] = Object.values(error.constraints);
    }
  });

  return {
    status: 'error',
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    errors: formattedErrors
  };
};

/**
 * Authentication request validation middleware
 * Implements enhanced security measures for auth endpoints
 */
export const validateAuthRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Apply rate limiting
    await rateLimiter.consume(req.ip);

    const { path } = req;
    let dto;

    // Select appropriate DTO based on endpoint
    switch (path) {
      case '/auth/login':
        dto = plainToClass(LoginDto, req.body);
        break;
      case '/auth/register':
        dto = plainToClass(RegisterDto, req.body);
        break;
      case '/auth/refresh':
        dto = plainToClass(RefreshTokenDto, req.body);
        break;
      default:
        throw new Error('Invalid auth endpoint');
    }

    // Validate request body against DTO
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true
    });

    if (errors.length > 0) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    // Additional security validations
    if (req.body.email && !ValidationUtils.validateEmail(req.body.email)) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_EMAIL',
        message: 'Invalid email format'
      });
      return;
    }

    next();
  } catch (error) {
    if (error.name === 'RateLimiterError') {
      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};

/**
 * Project request validation middleware
 * Implements comprehensive validation for project operations
 */
export const validateProjectRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Apply rate limiting
    await rateLimiter.consume(req.ip);

    let dto;
    const { method } = req;

    // Select appropriate DTO based on HTTP method
    switch (method) {
      case 'POST':
        dto = plainToClass(CreateProjectDTO, req.body);
        break;
      case 'PUT':
      case 'PATCH':
        dto = plainToClass(UpdateProjectDTO, req.body);
        break;
      case 'GET':
        dto = plainToClass(ProjectQueryDTO, req.query);
        break;
      default:
        throw new Error('Invalid HTTP method');
    }

    // Validate request against DTO
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true
    });

    if (errors.length > 0) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    // Additional project-specific validations
    if (req.body.teamMembers) {
      const invalidMembers = req.body.teamMembers.filter(
        (id: string) => !ValidationUtils.validateUUID(id)
      );
      
      if (invalidMembers.length > 0) {
        res.status(400).json({
          status: 'error',
          code: 'INVALID_TEAM_MEMBERS',
          message: 'Invalid team member IDs'
        });
        return;
      }
    }

    next();
  } catch (error) {
    if (error.name === 'RateLimiterError') {
      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};

/**
 * Task request validation middleware
 * Implements comprehensive validation for task operations
 */
export const validateTaskRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Apply rate limiting
    await rateLimiter.consume(req.ip);

    let dto;
    const { method } = req;

    // Select appropriate DTO based on HTTP method
    switch (method) {
      case 'POST':
        dto = plainToClass(CreateTaskDTO, req.body);
        break;
      case 'PUT':
      case 'PATCH':
        dto = plainToClass(UpdateTaskDTO, req.body);
        break;
      case 'GET':
        dto = plainToClass(TaskQueryDTO, req.query);
        break;
      default:
        throw new Error('Invalid HTTP method');
    }

    // Validate request against DTO
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true
    });

    if (errors.length > 0) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    // Additional task-specific validations
    if (req.body.assigneeId && !ValidationUtils.validateUUID(req.body.assigneeId)) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_ASSIGNEE',
        message: 'Invalid assignee ID'
      });
      return;
    }

    if (req.body.projectId && !ValidationUtils.validateUUID(req.body.projectId)) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_PROJECT',
        message: 'Invalid project ID'
      });
      return;
    }

    // Validate date constraints
    if (req.body.dueDate && !ValidationUtils.validateDate(req.body.dueDate)) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_DUE_DATE',
        message: 'Invalid due date'
      });
      return;
    }

    next();
  } catch (error) {
    if (error.name === 'RateLimiterError') {
      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};