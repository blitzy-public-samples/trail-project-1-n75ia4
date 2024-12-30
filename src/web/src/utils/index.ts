/**
 * @fileoverview Central utility exports providing a unified interface for common operations
 * across the frontend application. Implements comprehensive TypeScript support and optimized
 * bundle size through tree-shaking.
 * @version 1.0.0
 */

// API Utilities
export {
  handleApiError,
  formatQueryParams,
  handlePaginatedResponse
} from './api.utils';

// Date Utilities
export {
  formatDate,
  parseDate,
  getDaysRemaining,
  isOverdue,
  isWithinDateRange,
  getRelativeDateLabel
} from './date.utils';

// Storage Utilities
export {
  setItem,
  getItem,
  removeItem,
  clear,
  type StorageType,
  type StorageValue,
  type StorageError
} from './storage.utils';

// Validation Utilities
export {
  validateEmail,
  validatePassword,
  validateProjectName,
  sanitizeInput
} from './validation.utils';

/**
 * Global utility version for tracking and compatibility
 * @constant
 */
export const UTILS_VERSION = '1.0.0' as const;

/**
 * Debug mode flag based on environment
 * @constant
 */
export const DEBUG_MODE = process.env.NODE_ENV === 'development' as const;

/**
 * Type definitions for utility function parameters
 */
export interface UtilityConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Default date format */
  defaultDateFormat?: string;
  /** Storage encryption flag */
  encryptStorage?: boolean;
  /** Storage type preference */
  storageType?: 'localStorage' | 'sessionStorage';
}

/**
 * Default utility configuration
 * @constant
 */
export const DEFAULT_UTILITY_CONFIG: UtilityConfig = {
  debug: DEBUG_MODE,
  defaultDateFormat: 'yyyy-MM-dd',
  encryptStorage: true,
  storageType: 'localStorage'
} as const;

/**
 * Re-export common types from API types
 */
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  QueryParams
} from '../types/api.types';

/**
 * Re-export common types from Auth types
 */
export type {
  AuthTokens,
  TokenPayload,
  AuthState
} from '../types/auth.types';

/**
 * Re-export common types from User types
 */
export type {
  User,
  UserRole,
  UserStatus,
  UserPreferences
} from '../types/user.types';

/**
 * Re-export validation constants
 */
export {
  AUTH_VALIDATION,
  PROJECT_VALIDATION,
  TASK_VALIDATION
} from '../constants/validation.constants';

/**
 * Re-export API constants
 */
export {
  API_VERSION,
  API_ENDPOINTS,
  API_RATE_LIMITS,
  HTTP_METHODS,
  HTTP_STATUS
} from '../constants/api.constants';

// Freeze configuration object to prevent runtime modifications
Object.freeze(DEFAULT_UTILITY_CONFIG);