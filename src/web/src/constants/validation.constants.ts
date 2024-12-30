/**
 * @fileoverview Validation constants and rules for form validation across the application
 * @version 1.0.0
 * 
 * This file defines comprehensive validation rules, patterns, and error messages
 * for secure form validation throughout the application. It implements strict
 * input validation patterns and provides user-friendly error feedback.
 */

// Regular expressions for validation patterns
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
export const NAME_REGEX = /^[a-zA-Z\s-']+$/;
export const PROJECT_NAME_REGEX = /^[a-zA-Z0-9\s-_]+$/;
export const TAG_REGEX = /^[a-zA-Z0-9-_]+$/;

/**
 * Authentication validation rules and constraints
 */
export const AUTH_VALIDATION = {
  EMAIL: {
    pattern: EMAIL_REGEX,
    maxLength: 255,
    messages: {
      required: 'Email address is required',
      pattern: 'Please enter a valid email address',
      maxLength: 'Email address is too long',
      unique: 'This email is already registered'
    }
  },
  PASSWORD: {
    minLength: 12,
    maxLength: 128,
    pattern: PASSWORD_REGEX,
    messages: {
      required: 'Password is required',
      minLength: 'Password must be at least 12 characters',
      maxLength: 'Password cannot exceed 128 characters',
      pattern: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      history: 'Password cannot be the same as your last 5 passwords'
    }
  },
  NAME: {
    minLength: 2,
    maxLength: 50,
    pattern: NAME_REGEX,
    messages: {
      required: 'Full name is required',
      minLength: 'Name must be at least 2 characters',
      maxLength: 'Name cannot exceed 50 characters',
      pattern: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }
  },
  MFA_CODE: {
    pattern: /^[0-9]{6}$/,
    messages: {
      required: 'MFA code is required',
      pattern: 'MFA code must be 6 digits',
      invalid: 'Invalid MFA code'
    }
  }
} as const;

/**
 * Project validation rules and constraints
 */
export const PROJECT_VALIDATION = {
  NAME: {
    minLength: 3,
    maxLength: 100,
    pattern: PROJECT_NAME_REGEX,
    messages: {
      required: 'Project name is required',
      minLength: 'Project name must be at least 3 characters',
      maxLength: 'Project name cannot exceed 100 characters',
      pattern: 'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
      unique: 'A project with this name already exists'
    }
  },
  DESCRIPTION: {
    maxLength: 2000,
    minLength: 10,
    messages: {
      required: 'Project description is required',
      minLength: 'Description must be at least 10 characters',
      maxLength: 'Description cannot exceed 2000 characters'
    }
  },
  DATES: {
    messages: {
      startRequired: 'Start date is required',
      endRequired: 'End date is required',
      endAfterStart: 'End date must be after start date',
      startAfterToday: 'Start date cannot be in the past',
      maxDuration: 'Project duration cannot exceed 2 years'
    }
  },
  TAGS: {
    maxTags: 10,
    maxLength: 20,
    pattern: TAG_REGEX,
    messages: {
      maxTags: 'Cannot add more than 10 tags',
      maxLength: 'Tag length cannot exceed 20 characters',
      pattern: 'Tags can only contain letters, numbers, hyphens, and underscores',
      duplicate: 'Duplicate tag names are not allowed'
    }
  }
} as const;

/**
 * Task validation rules and constraints
 */
export const TASK_VALIDATION = {
  TITLE: {
    minLength: 3,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s!@#$%^&*(),.?":{}|<>]+$/,
    messages: {
      required: 'Task title is required',
      minLength: 'Title must be at least 3 characters',
      maxLength: 'Title cannot exceed 200 characters',
      pattern: 'Title contains invalid characters'
    }
  },
  DESCRIPTION: {
    maxLength: 5000,
    minLength: 10,
    messages: {
      required: 'Task description is required',
      minLength: 'Description must be at least 10 characters',
      maxLength: 'Description cannot exceed 5000 characters'
    }
  },
  DUE_DATE: {
    messages: {
      required: 'Due date is required',
      future: 'Due date must be in the future',
      withinProject: 'Due date must be within project timeline',
      workingDays: 'Due date must be on a working day'
    }
  },
  PRIORITY: {
    values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const,
    messages: {
      required: 'Task priority is required',
      invalid: 'Invalid priority level'
    }
  },
  ASSIGNEES: {
    maxAssignees: 5,
    messages: {
      required: 'At least one assignee is required',
      maxAssignees: 'Cannot assign more than 5 team members',
      invalidUser: 'Selected user is not a project member'
    }
  }
} as const;