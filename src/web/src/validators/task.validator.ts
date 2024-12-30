/**
 * @fileoverview Task validation schemas and utility functions using Joi
 * Implements comprehensive validation for task-related operations with security,
 * internationalization, and accessibility requirements.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.x
import { TASK_VALIDATION } from '../constants/validation.constants';
import {
  TaskStatus,
  TaskPriority,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskQueryParams,
} from '../types/task.types';

/**
 * Custom Joi extension for enhanced security validation
 */
const JoiSecure = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.xss': 'Input contains potentially unsafe content',
  },
  rules: {
    sanitize: {
      validate(value: string) {
        // Basic XSS prevention - can be enhanced based on security requirements
        const sanitized = value.replace(/[<>]/g, '');
        return sanitized;
      },
    },
  },
}));

/**
 * Validation schema for task creation
 * Implements strict validation rules with security considerations
 */
export const createTaskSchema = Joi.object<CreateTaskDTO>({
  title: JoiSecure.string()
    .trim()
    .min(TASK_VALIDATION.TITLE.minLength)
    .max(TASK_VALIDATION.TITLE.maxLength)
    .required()
    .pattern(TASK_VALIDATION.TITLE.pattern)
    .messages({
      'string.empty': TASK_VALIDATION.TITLE.messages.required,
      'string.min': TASK_VALIDATION.TITLE.messages.minLength,
      'string.max': TASK_VALIDATION.TITLE.messages.maxLength,
      'string.pattern.base': TASK_VALIDATION.TITLE.messages.pattern,
    }),

  description: JoiSecure.string()
    .trim()
    .min(TASK_VALIDATION.DESCRIPTION.minLength)
    .max(TASK_VALIDATION.DESCRIPTION.maxLength)
    .required()
    .messages({
      'string.empty': TASK_VALIDATION.DESCRIPTION.messages.required,
      'string.min': TASK_VALIDATION.DESCRIPTION.messages.minLength,
      'string.max': TASK_VALIDATION.DESCRIPTION.messages.maxLength,
    }),

  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .required()
    .messages({
      'any.required': TASK_VALIDATION.PRIORITY.messages.required,
      'any.only': TASK_VALIDATION.PRIORITY.messages.invalid,
    }),

  assigneeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid assignee ID format',
      'any.required': TASK_VALIDATION.ASSIGNEES.messages.required,
    }),

  projectId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid project ID format',
      'any.required': 'Project ID is required',
    }),

  dueDate: Joi.date()
    .greater('now')
    .required()
    .messages({
      'date.greater': TASK_VALIDATION.DUE_DATE.messages.future,
      'any.required': TASK_VALIDATION.DUE_DATE.messages.required,
    }),

  attachments: Joi.array()
    .items(
      Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .max(2048)
    )
    .max(10)
    .default([])
    .messages({
      'array.max': 'Maximum 10 attachments allowed',
      'string.uri': 'Invalid attachment URL',
      'string.max': 'Attachment URL is too long',
    }),

  tags: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[a-zA-Z0-9-_]+$/)
        .max(20)
    )
    .max(10)
    .default([])
    .messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.pattern.base': 'Tags can only contain letters, numbers, hyphens, and underscores',
    }),
}).options({ abortEarly: false, stripUnknown: true });

/**
 * Validation schema for task updates
 * Supports partial updates with the same validation rules
 */
export const updateTaskSchema = Joi.object<UpdateTaskDTO>({
  title: createTaskSchema.extract('title').optional(),
  description: createTaskSchema.extract('description').optional(),
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .messages({
      'any.only': 'Invalid task status',
    }),
  priority: createTaskSchema.extract('priority').optional(),
  assigneeId: createTaskSchema.extract('assigneeId').optional(),
  dueDate: createTaskSchema.extract('dueDate').optional(),
  attachments: createTaskSchema.extract('attachments').optional(),
  tags: createTaskSchema.extract('tags').optional(),
}).min(1).options({ abortEarly: false, stripUnknown: true });

/**
 * Validation schema for task query parameters
 * Implements pagination, sorting, and filtering validation
 */
export const taskQuerySchema = Joi.object<TaskQueryParams>({
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .optional(),
  
  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .optional(),
  
  assigneeId: Joi.string()
    .uuid()
    .optional(),
  
  projectId: Joi.string()
    .uuid()
    .optional(),
  
  dueDate: Joi.date()
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page number must be greater than 0',
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be greater than 0',
      'number.max': 'Maximum 100 items per page',
    }),
  
  sortBy: Joi.string()
    .valid('dueDate', 'priority', 'status', 'createdAt', 'title')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  
  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query is too long',
    }),
}).options({ abortEarly: false, stripUnknown: true });

/**
 * Validates task creation data with enhanced security and error handling
 * @param data Task creation data to validate
 * @returns Validation result with detailed error messages
 */
export async function validateCreateTask(data: CreateTaskDTO) {
  try {
    return await createTaskSchema.validateAsync(data);
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      throw new Error(JSON.stringify(errors));
    }
    throw error;
  }
}

/**
 * Validates task update data with partial update support
 * @param data Task update data to validate
 * @returns Validation result with detailed error messages
 */
export async function validateUpdateTask(data: UpdateTaskDTO) {
  try {
    return await updateTaskSchema.validateAsync(data);
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      throw new Error(JSON.stringify(errors));
    }
    throw error;
  }
}

/**
 * Validates task query parameters with pagination support
 * @param params Query parameters to validate
 * @returns Validation result with detailed error messages
 */
export async function validateTaskQuery(params: TaskQueryParams) {
  try {
    return await taskQuerySchema.validateAsync(params);
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      throw new Error(JSON.stringify(errors));
    }
    throw error;
  }
}