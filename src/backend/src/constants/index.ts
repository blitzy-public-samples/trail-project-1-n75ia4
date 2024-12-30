/**
 * @fileoverview Central export point for all constants used in the Task Management System.
 * Aggregates and re-exports error codes, status codes, messages, and other constants
 * for consistent system-wide usage. Implements internationalization support and
 * maintains security-safe message content.
 * 
 * @version 1.0.0
 * @module Constants
 */

// Import error handling constants
import {
  ErrorCode,
  ErrorMessage,
  isValidErrorCode,
  getErrorMessage
} from './error-codes';

// Import HTTP status code constants
import {
  StatusCode,
  StatusCodeDescription,
  isValidStatusCode,
  getStatusCodeDescription
} from './status-codes';

// Import message constants and utilities
import {
  SuccessMessages,
  ErrorMessages,
  NotificationMessages,
  ValidationMessages,
  formatMessage,
  getMessageForStatus,
  type SuccessMessageKey,
  type ErrorMessageKey,
  type NotificationMessageKey,
  type ValidationMessageKey
} from './messages';

/**
 * Re-export all error handling related constants and utilities
 */
export {
  ErrorCode,
  ErrorMessage,
  isValidErrorCode,
  getErrorMessage
};

/**
 * Re-export all HTTP status code related constants and utilities
 */
export {
  StatusCode,
  StatusCodeDescription,
  isValidStatusCode,
  getStatusCodeDescription
};

/**
 * Re-export all message constants and utilities
 */
export {
  SuccessMessages,
  ErrorMessages,
  NotificationMessages,
  ValidationMessages,
  formatMessage,
  getMessageForStatus
};

/**
 * Re-export message type definitions
 */
export type {
  SuccessMessageKey,
  ErrorMessageKey,
  NotificationMessageKey,
  ValidationMessageKey
};

/**
 * System-wide configuration constants
 */
export const SystemConstants = {
  /**
   * API rate limiting configuration
   */
  RATE_LIMITS: {
    DEFAULT: 100, // Default requests per minute
    AUTH: 20,     // Authentication endpoints
    FILES: 50     // File upload endpoints
  },

  /**
   * Pagination defaults
   */
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 25,
    MAX_PAGE_SIZE: 100,
    MIN_PAGE: 1
  },

  /**
   * Cache configuration
   */
  CACHE: {
    TTL: {
      SHORT: 300,    // 5 minutes in seconds
      MEDIUM: 3600,  // 1 hour in seconds
      LONG: 86400    // 24 hours in seconds
    }
  },

  /**
   * Security configuration
   */
  SECURITY: {
    PASSWORD_MIN_LENGTH: 12,
    TOKEN_EXPIRY: 3600, // 1 hour in seconds
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 900 // 15 minutes in seconds
  },

  /**
   * File upload limits
   */
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'],
    MAX_FILES_PER_REQUEST: 5
  }
} as const;

/**
 * Validation constants for data integrity checks
 */
export const ValidationConstants = {
  /**
   * Regular expressions for validation
   */
  REGEX: {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
    PHONE: /^\+?[1-9]\d{1,14}$/
  },

  /**
   * Field length constraints
   */
  LENGTH: {
    MIN_USERNAME: 3,
    MAX_USERNAME: 20,
    MIN_PASSWORD: 12,
    MAX_PASSWORD: 128,
    MAX_TITLE: 200,
    MAX_DESCRIPTION: 5000,
    MAX_COMMENT: 1000
  }
} as const;

/**
 * Default values for system entities
 */
export const DefaultValues = {
  /**
   * Task defaults
   */
  TASK: {
    STATUS: 'PENDING',
    PRIORITY: 'MEDIUM',
    DUE_DATE_OFFSET: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  },

  /**
   * Project defaults
   */
  PROJECT: {
    STATUS: 'ACTIVE',
    VISIBILITY: 'PRIVATE'
  },

  /**
   * User preferences defaults
   */
  USER_PREFERENCES: {
    THEME: 'light',
    LANGUAGE: 'en',
    NOTIFICATIONS: {
      EMAIL: true,
      PUSH: true,
      TASK_REMINDERS: true,
      PROJECT_UPDATES: true
    }
  }
} as const;

// Export all constants as a namespace for convenient access
export const Constants = {
  System: SystemConstants,
  Validation: ValidationConstants,
  Defaults: DefaultValues
} as const;

// Default export for convenient importing
export default Constants;