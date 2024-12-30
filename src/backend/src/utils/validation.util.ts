/**
 * @fileoverview Comprehensive validation utility module for secure data validation
 * @version 1.0.0
 * @module utils/validation
 * 
 * This module implements robust, type-safe validation functions with OWASP compliance
 * for data validation, input sanitization, and type checking across the task management system.
 */

// External imports - versions specified as per security requirements
import { validate } from 'class-validator'; // ^0.14.0
import { sanitize } from 'class-sanitizer'; // ^1.0.1
import { isUUID, isEmail, isDate, escape, normalizeEmail } from 'validator'; // ^13.9.0

// Internal type imports
import {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  ProjectPriority,
  UserRole
} from '../types';

/**
 * Validates if a string is a valid UUID v4
 * @param {string} uuid - The UUID string to validate
 * @returns {boolean} True if valid UUID, false otherwise
 */
export const validateUUID = (uuid: string): boolean => {
  try {
    const sanitizedUuid = escape(uuid.trim());
    if (!sanitizedUuid) {
      return false;
    }
    return isUUID(sanitizedUuid, 4);
  } catch (error) {
    console.error('UUID validation error:', error);
    return false;
  }
};

/**
 * Validates email format with comprehensive checks
 * Implements security measures against email injection attacks
 * @param {string} email - The email address to validate
 * @returns {boolean} True if valid email, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  try {
    const sanitizedEmail = escape(email.trim().toLowerCase());
    if (!sanitizedEmail) {
      return false;
    }

    // Normalize email format
    const normalizedEmail = normalizeEmail(sanitizedEmail, {
      all_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      gmail_convert_googlemaildotcom: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    });

    if (!normalizedEmail) {
      return false;
    }

    // Comprehensive email validation
    return isEmail(normalizedEmail, {
      allow_display_name: false,
      require_display_name: false,
      allow_utf8_local_part: false,
      require_tld: true,
      allow_ip_domain: false,
      domain_specific_validation: true,
      blacklisted_chars: '<>()[]\\,;:',
    });
  } catch (error) {
    console.error('Email validation error:', error);
    return false;
  }
};

/**
 * Validates task status with type checking
 * @param {string} status - The task status to validate
 * @returns {boolean} True if valid status, false otherwise
 */
export const validateTaskStatus = (status: string): boolean => {
  try {
    const sanitizedStatus = escape(status.trim().toUpperCase());
    return Object.values(TaskStatus).includes(sanitizedStatus as TaskStatus);
  } catch (error) {
    console.error('Task status validation error:', error);
    return false;
  }
};

/**
 * Validates project status with type checking
 * @param {string} status - The project status to validate
 * @returns {boolean} True if valid status, false otherwise
 */
export const validateProjectStatus = (status: string): boolean => {
  try {
    const sanitizedStatus = escape(status.trim().toUpperCase());
    return Object.values(ProjectStatus).includes(sanitizedStatus as ProjectStatus);
  } catch (error) {
    console.error('Project status validation error:', error);
    return false;
  }
};

/**
 * Validates priority values for tasks and projects
 * @param {string} priority - The priority value to validate
 * @param {'task' | 'project'} type - The type of priority to validate
 * @returns {boolean} True if valid priority, false otherwise
 */
export const validatePriority = (priority: string, type: 'task' | 'project'): boolean => {
  try {
    const sanitizedPriority = escape(priority.trim().toUpperCase());
    
    if (type === 'task') {
      return Object.values(TaskPriority).includes(sanitizedPriority as TaskPriority);
    } else if (type === 'project') {
      return Object.values(ProjectPriority).includes(sanitizedPriority as ProjectPriority);
    }
    
    return false;
  } catch (error) {
    console.error('Priority validation error:', error);
    return false;
  }
};

/**
 * Validates user roles with security checks
 * @param {string} role - The user role to validate
 * @returns {boolean} True if valid role, false otherwise
 */
export const validateUserRole = (role: string): boolean => {
  try {
    const sanitizedRole = escape(role.trim().toUpperCase());
    return Object.values(UserRole).includes(sanitizedRole as UserRole);
  } catch (error) {
    console.error('User role validation error:', error);
    return false;
  }
};

/**
 * Validates dates with comprehensive format and range checking
 * @param {string} date - The date string to validate
 * @returns {boolean} True if valid date, false otherwise
 */
export const validateDate = (date: string): boolean => {
  try {
    const sanitizedDate = escape(date.trim());
    if (!sanitizedDate) {
      return false;
    }

    // Check if it's a valid date format
    if (!isDate(sanitizedDate)) {
      return false;
    }

    const parsedDate = new Date(sanitizedDate);
    const now = new Date();

    // Validate date range (not more than 10 years in the future)
    const maxDate = new Date();
    maxDate.setFullYear(now.getFullYear() + 10);

    return parsedDate >= now && parsedDate <= maxDate;
  } catch (error) {
    console.error('Date validation error:', error);
    return false;
  }
};

/**
 * Comprehensive input sanitization for security compliance
 * Implements OWASP security recommendations
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized input string
 */
export const sanitizeInput = (input: string): string => {
  try {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Escape special characters
    sanitized = escape(sanitized);

    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/['";]/g, '');

    // Remove null bytes and other control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Limit string length for security
    const MAX_LENGTH = 1000;
    return sanitized.substring(0, MAX_LENGTH);
  } catch (error) {
    console.error('Input sanitization error:', error);
    return '';
  }
};

// Export validation utilities as a namespace for organization
export const ValidationUtils = {
  validateUUID,
  validateEmail,
  validateTaskStatus,
  validateProjectStatus,
  validatePriority,
  validateUserRole,
  validateDate,
  sanitizeInput
};