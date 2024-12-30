/**
 * @fileoverview Centralized type definitions index file that re-exports all types,
 * interfaces, and enums used throughout the frontend application. Implements a
 * comprehensive type system for enhanced type safety and validation.
 * @version 1.0.0
 */

// API Types
export {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  QueryParams,
  ApiEndpoint,
  EnhancedAxiosResponse,
  EnhancedAxiosError,
  EnhancedRequestConfig,
  HttpMethod,
  ApiErrorCode,
  ResponseStatus,
  CacheControl,
  ApiVersion
} from './api.types';

// Authentication Types
export {
  AuthTokenType,
  AuthProvider,
  TokenPayload,
  AuthTokens,
  AuthState,
  AuthRequest,
  AuthResponse,
  RefreshTokenRequest,
  TokenValidationResponse,
  isAuthTokenType,
  isAuthProvider
} from './auth.types';

// Project Types
export {
  ProjectStatus,
  ProjectPriority,
  Project,
  ProjectQueryParams,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectResponse,
  PaginatedProjectResponse,
  ProjectTimeline,
  ProjectResource,
  isProjectStatus,
  isProjectPriority
} from './project.types';

// Task Types
export {
  TaskStatus,
  TaskPriority,
  Task,
  TaskStats,
  TaskTimeline,
  TaskQueryParams,
  PaginatedTaskResponse,
  TaskApiResponse,
  TaskStatsApiResponse,
  TaskTimelineApiResponse
} from './task.types';

// User Types
export {
  UserRole,
  UserStatus,
  NotificationFrequency,
  AccessibilityPreferences,
  NotificationPreferences,
  UserPreferences,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserQueryParams,
  PaginatedUserResponse,
  UserResponse,
  isUserRole,
  isUserStatus
} from './user.types';

/**
 * Re-export commonly used type combinations for convenience
 */
export type EntityId = string;
export type Timestamp = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue }
export interface JSONArray extends Array<JSONValue> {}

/**
 * Type guard to check if a value is a valid JSON value
 * @param value - Value to check
 */
export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJSONValue);
  if (typeof value === 'object') {
    return Object.values(value as object).every(isJSONValue);
  }
  return false;
}

/**
 * Type guard to check if a value is a valid Timestamp
 * @param value - Value to check
 */
export function isTimestamp(value: unknown): value is Timestamp {
  if (typeof value !== 'string') return false;
  return !isNaN(Date.parse(value));
}

/**
 * Type guard to check if a value is a valid EntityId
 * @param value - Value to check
 */
export function isEntityId(value: unknown): value is EntityId {
  return typeof value === 'string' && value.length > 0;
}