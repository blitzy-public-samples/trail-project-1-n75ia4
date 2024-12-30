/**
 * @fileoverview Standardized error codes and messages for the Task Management System
 * Implements a comprehensive error classification system for consistent error handling
 * across all microservices.
 * 
 * @version 1.0.0
 */

/**
 * Enumeration of all possible error codes in the system.
 * Error codes are grouped by category:
 * - 1000-1099: Validation errors
 * - 1100-1199: Authentication/Authorization errors
 * - 1200-1299: Resource errors
 * - 1300-1399: Database errors
 * - 1400-1499: Rate limiting errors
 * - 1500-1599: System/Service errors
 */
export enum ErrorCode {
  // Validation Errors (1000-1099)
  VALIDATION_ERROR = 1000,
  INVALID_INPUT = 1001,
  INVALID_FORMAT = 1002,
  MISSING_REQUIRED_FIELD = 1003,

  // Authentication/Authorization Errors (1100-1199)
  AUTHENTICATION_ERROR = 1100,
  AUTHORIZATION_ERROR = 1101,
  TOKEN_EXPIRED = 1102,
  TOKEN_INVALID = 1103,
  INSUFFICIENT_PERMISSIONS = 1104,

  // Resource Errors (1200-1299)
  RESOURCE_NOT_FOUND = 1200,
  RESOURCE_LOCKED = 1201,
  RESOURCE_CONFLICT = 1202,

  // Database Errors (1300-1399)
  DATABASE_ERROR = 1300,
  DATABASE_CONNECTION_ERROR = 1301,
  DATABASE_QUERY_ERROR = 1302,

  // Rate Limiting Errors (1400-1499)
  RATE_LIMIT_ERROR = 1400,

  // System/Service Errors (1500-1599)
  INTERNAL_SERVER_ERROR = 1500,
  SERVICE_UNAVAILABLE = 1501,
  EXTERNAL_SERVICE_ERROR = 1502
}

/**
 * Human-readable error messages corresponding to each error code.
 * These messages are designed to be user-friendly while providing
 * enough context for debugging purposes.
 */
export const ErrorMessage: { [key in ErrorCode]: string } = {
  // Validation Error Messages
  [ErrorCode.VALIDATION_ERROR]: 'Request validation failed',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.INVALID_FORMAT]: 'Invalid data format',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',

  // Authentication/Authorization Error Messages
  [ErrorCode.AUTHENTICATION_ERROR]: 'Authentication failed - invalid credentials',
  [ErrorCode.AUTHORIZATION_ERROR]: 'Authorization failed - insufficient permissions',
  [ErrorCode.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCode.TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for this operation',

  // Resource Error Messages
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Requested resource could not be found',
  [ErrorCode.RESOURCE_LOCKED]: 'Resource is currently locked',
  [ErrorCode.RESOURCE_CONFLICT]: 'Resource conflict detected',

  // Database Error Messages
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'Database connection failed',
  [ErrorCode.DATABASE_QUERY_ERROR]: 'Database query execution failed',

  // Rate Limiting Error Messages
  [ErrorCode.RATE_LIMIT_ERROR]: 'Rate limit exceeded - please try again later',

  // System/Service Error Messages
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error occurred',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is currently unavailable',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error occurred'
} as const;

/**
 * Type guard to check if a number is a valid ErrorCode
 * @param code - The number to check
 * @returns boolean indicating if the code is a valid ErrorCode
 */
export const isValidErrorCode = (code: number): code is ErrorCode => {
  return Object.values(ErrorCode).includes(code);
};

/**
 * Get the error message for a given error code
 * @param code - The ErrorCode to get the message for
 * @returns The corresponding error message
 */
export const getErrorMessage = (code: ErrorCode): string => {
  return ErrorMessage[code];
};