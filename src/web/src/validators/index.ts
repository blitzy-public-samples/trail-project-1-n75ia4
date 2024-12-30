/**
 * @fileoverview Central export file for validation schemas and utilities
 * Aggregates and re-exports all validation schemas and functions from validation modules
 * for authentication, projects, tasks, and users.
 * @version 1.0.0
 */

// Authentication validation schemas and utilities
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateLoginCredentials,
  validatePasswordComplexity
} from './auth.validator';

// Project validation schemas
import {
  createProjectSchema,
  updateProjectSchema
} from './project.validator';

// Task validation schemas and utilities
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  validateCreateTask,
  validateUpdateTask,
  validateTaskQuery
} from './task.validator';

// User validation schemas and utilities
import {
  userProfileSchema,
  userPreferencesSchema,
  userPasswordSchema,
  validateUserProfile,
  validateUserPreferences,
  isValidRoleChange,
  isValidStatusTransition
} from './user.validator';

/**
 * Authentication validation schemas and utilities
 */
export const auth = {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateLoginCredentials,
  validatePasswordComplexity
} as const;

/**
 * Project validation schemas
 */
export const project = {
  createProjectSchema,
  updateProjectSchema
} as const;

/**
 * Task validation schemas and utilities
 */
export const task = {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  validateCreateTask,
  validateUpdateTask,
  validateTaskQuery
} as const;

/**
 * User validation schemas and utilities
 */
export const user = {
  profileSchema: userProfileSchema,
  preferencesSchema: userPreferencesSchema,
  passwordSchema: userPasswordSchema,
  validateProfile: validateUserProfile,
  validatePreferences: validateUserPreferences,
  isValidRoleChange,
  isValidStatusTransition
} as const;

// Type-safe exports for direct imports
export type {
  ValidationResult,
  ValidationMetadata
} from './auth.validator';

export type {
  CreateProjectDTO,
  UpdateProjectDTO
} from '../types/project.types';

export type {
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskQueryParams
} from '../types/task.types';

export type {
  User,
  UserPreferences,
  UserRole,
  UserStatus
} from '../types/user.types';

/**
 * Default export providing all validation schemas and utilities
 * organized by domain
 */
export default {
  auth,
  project,
  task,
  user
} as const;
```

This implementation:

1. Follows enterprise-grade coding practices with comprehensive documentation and type safety.

2. Organizes validation schemas and utilities into domain-specific namespaces (auth, project, task, user) for better code organization and maintainability.

3. Provides both named exports for individual schemas/utilities and a default export with all validators organized by domain.

4. Includes type exports to ensure type safety when using the validation schemas.

5. Uses const assertions to ensure the exported objects are read-only and type-safe.

6. Implements comprehensive JSDoc documentation for better code understanding and IDE support.

7. Follows the technical specification requirements for data security and input validation by centralizing all validation schemas in one place.

8. Provides a clean and intuitive API for accessing validation schemas across the application.

The code can be used in two ways:

1. Named imports for specific validators:
```typescript
import { auth, project, task, user } from '@/validators';
// or
import { auth } from '@/validators/index';
```

2. Default import for all validators:
```typescript
import validators from '@/validators';
validators.auth.loginSchema;
validators.project.createProjectSchema;