/**
 * @fileoverview API type definitions for request/response handling, error management,
 * and common API operations in the frontend application.
 * @version 1.0.0
 */

import { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios'; // v1.6.0

/**
 * Generic interface for API responses with enhanced tracking capabilities.
 * Provides a standardized structure for all API responses.
 */
export interface ApiResponse<T = any> {
  /** Response payload data */
  data: T;
  /** Human-readable response message */
  message: string;
  /** HTTP status code */
  status: number;
  /** ISO timestamp of the response */
  timestamp: string;
}

/**
 * Enhanced API error response structure with security and tracking features.
 * Implements comprehensive error tracking and debugging capabilities.
 */
export interface ApiError {
  /** Human-readable error message */
  message: string;
  /** Error code for client-side error handling */
  code: string;
  /** HTTP status code */
  status: number;
  /** Additional error context and debugging information */
  details: Record<string, any>;
  /** ISO timestamp of the error */
  timestamp: string;
  /** Unique trace ID for error tracking */
  traceId: string;
}

/**
 * Enhanced paginated API response structure with navigation helpers.
 * Provides comprehensive pagination metadata for list endpoints.
 */
export interface PaginatedResponse<T> {
  /** Array of paginated items */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of available pages */
  totalPages: number;
  /** Indicates if there are more pages available */
  hasNext: boolean;
}

/**
 * Enhanced API query parameters structure with advanced filtering capabilities.
 * Supports comprehensive data querying and filtering options.
 */
export interface QueryParams {
  /** Page number for pagination (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sort?: string;
  /** Sort direction */
  order?: 'asc' | 'desc';
  /** Search query string */
  search?: string;
  /** Advanced filtering criteria */
  filter?: Record<string, any>;
  /** Specific fields to include in the response */
  fields?: string[];
}

/**
 * Comprehensive enumeration of API endpoints.
 * Centralizes API route management and provides type safety.
 */
export enum ApiEndpoint {
  AUTH = '/auth',
  USERS = '/users',
  PROJECTS = '/projects',
  TASKS = '/tasks',
  COMMENTS = '/comments',
  ATTACHMENTS = '/attachments'
}

/**
 * Type alias for enhanced Axios response with our API structure
 */
export type EnhancedAxiosResponse<T = any> = AxiosResponse<ApiResponse<T>>;

/**
 * Type alias for enhanced Axios error with our error structure
 */
export type EnhancedAxiosError = AxiosError<ApiError>;

/**
 * Enhanced request configuration with additional security options
 */
export interface EnhancedRequestConfig extends AxiosRequestConfig {
  /** Skip default error handling */
  skipErrorHandling?: boolean;
  /** Retry configuration */
  retry?: {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Delay between retries in milliseconds */
    retryDelay: number;
  };
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * HTTP method enumeration for type safety
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

/**
 * API error codes enumeration for standardized error handling
 */
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BAD_REQUEST = 'BAD_REQUEST'
}

/**
 * Response status enumeration for standardized status handling
 */
export enum ResponseStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

/**
 * Cache control options for API requests
 */
export interface CacheControl {
  /** Enable response caching */
  enableCache: boolean;
  /** Cache duration in seconds */
  maxAge?: number;
  /** Cache key prefix */
  prefix?: string;
}

/**
 * API version configuration
 */
export interface ApiVersion {
  /** Major version number */
  major: number;
  /** Minor version number */
  minor: number;
  /** API version string */
  version: string;
}