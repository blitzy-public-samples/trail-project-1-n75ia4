/**
 * @fileoverview Defines standardized messages for consistent communication across the Task Management System.
 * Implements message templating and internationalization support for all system communications.
 * @version 1.0.0
 */

import { ErrorCode } from './error-codes';
import { StatusCode } from './status-codes';

/**
 * Interface for message template parameters
 */
interface MessageParams {
  [key: string]: string | number;
}

/**
 * Success messages for all successful operations
 */
export const SuccessMessages = {
  // Authentication & User Management
  LOGIN_SUCCESS: 'Successfully logged in',
  LOGOUT_SUCCESS: 'Successfully logged out',
  REGISTRATION_SUCCESS: 'Registration successful',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully',

  // Project Management
  PROJECT_CREATE_SUCCESS: 'Project {0} created successfully',
  PROJECT_UPDATE_SUCCESS: 'Project {0} updated successfully',
  PROJECT_DELETE_SUCCESS: 'Project {0} deleted successfully',

  // Task Management
  TASK_CREATE_SUCCESS: 'Task {0} created successfully',
  TASK_UPDATE_SUCCESS: 'Task {0} updated successfully',
  TASK_DELETE_SUCCESS: 'Task {0} deleted successfully',
  COMMENT_ADD_SUCCESS: 'Comment added to {0} successfully',

  // File Management
  FILE_UPLOAD_SUCCESS: 'File {0} uploaded successfully',

  // Team Management
  TEAM_INVITE_SUCCESS: 'Invitation sent to {0} successfully',
  SETTINGS_UPDATE_SUCCESS: 'Settings updated successfully'
} as const;

/**
 * Error messages for all error scenarios
 */
export const ErrorMessages = {
  // Authentication & Authorization Errors
  [ErrorCode.AUTHENTICATION_ERROR]: 'Invalid email or password',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired, please log in again',
  [ErrorCode.TOKEN_INVALID]: 'Invalid or expired token',
  DUPLICATE_EMAIL: 'Email {0} is already registered',
  WEAK_PASSWORD: 'Password must contain at least {0} characters including uppercase, lowercase, number and special character',

  // Resource Errors
  PROJECT_NOT_FOUND: 'Project {0} not found',
  TASK_NOT_FOUND: 'Task {0} not found',
  USER_NOT_FOUND: 'User {0} not found',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to {0}',

  // File Operation Errors
  FILE_SIZE_EXCEEDED: 'File size exceeds limit of {0}MB',
  INVALID_FILE_TYPE: 'File type {0} is not supported',

  // System Errors
  [ErrorCode.RATE_LIMIT_ERROR]: 'Rate limit exceeded. Please try again in {0} seconds',
  [ErrorCode.VALIDATION_ERROR]: 'Validation failed: {0}',
  SYSTEM_ERROR: 'An unexpected error occurred',
  DATABASE_ERROR: 'Database operation failed',
  NETWORK_ERROR: 'Network connection error'
} as const;

/**
 * Notification messages for user alerts and updates
 */
export const NotificationMessages = {
  // Task Notifications
  TASK_ASSIGNED: '{0} has assigned you task {1}',
  TASK_DUE_SOON: 'Task {0} is due in {1} hours',
  TASK_STATUS_CHANGE: 'Task {0} status changed to {1}',

  // Interaction Notifications
  COMMENT_RECEIVED: '{0} commented on task {1}',
  MENTION_RECEIVED: '{0} mentioned you in {1}',

  // Project Notifications
  PROJECT_INVITE: '{0} invited you to join project {1}',
  PROJECT_ROLE_CHANGE: 'Your role in project {0} changed to {1}',

  // Security Notifications
  PASSWORD_RESET_REQUEST: 'Password reset requested for your account',
  SECURITY_ALERT: 'Security alert: {0}',

  // Team Notifications
  TEAM_UPDATE: 'Team {0} has been updated'
} as const;

/**
 * Validation messages for form validation and data integrity
 */
export const ValidationMessages = {
  // Field Validation
  REQUIRED_FIELD: '{0} is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  MIN_LENGTH: '{0} must be at least {1} characters',
  MAX_LENGTH: '{0} must not exceed {1} characters',

  // Date Validation
  INVALID_DATE: 'Please enter a valid date for {0}',
  FUTURE_DATE: '{0} must be in the future',

  // Status and Priority Validation
  INVALID_STATUS: 'Invalid status: {0}',
  INVALID_PRIORITY: 'Invalid priority: {0}',

  // Format and Constraint Validation
  INVALID_FORMAT: 'Invalid format for {0}',
  UNIQUE_CONSTRAINT: '{0} must be unique',
  NUMERIC_RANGE: '{0} must be between {1} and {2}',
  INVALID_RELATIONSHIP: 'Invalid relationship between {0} and {1}'
} as const;

/**
 * Formats a message template with provided parameters
 * @param template - Message template with {n} placeholders
 * @param params - Array of parameter values to insert
 * @returns Formatted message string
 */
export const formatMessage = (template: string, ...params: (string | number)[]): string => {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const value = params[parseInt(index)];
    return value !== undefined ? value.toString() : match;
  });
};

/**
 * Maps HTTP status codes to appropriate success/error messages
 * @param statusCode - HTTP status code
 * @param params - Optional parameters for message template
 * @returns Appropriate message for the status code
 */
export const getMessageForStatus = (statusCode: StatusCode, ...params: (string | number)[]): string => {
  switch (statusCode) {
    case StatusCode.SUCCESS:
      return SuccessMessages.LOGIN_SUCCESS;
    case StatusCode.CREATED:
      return formatMessage(SuccessMessages.PROJECT_CREATE_SUCCESS, ...params);
    case StatusCode.BAD_REQUEST:
      return formatMessage(ErrorMessages[ErrorCode.VALIDATION_ERROR], ...params);
    case StatusCode.UNAUTHORIZED:
      return ErrorMessages[ErrorCode.AUTHENTICATION_ERROR];
    default:
      return 'Operation completed';
  }
};

/**
 * Type definitions for message categories
 */
export type SuccessMessageKey = keyof typeof SuccessMessages;
export type ErrorMessageKey = keyof typeof ErrorMessages;
export type NotificationMessageKey = keyof typeof NotificationMessages;
export type ValidationMessageKey = keyof typeof ValidationMessages;