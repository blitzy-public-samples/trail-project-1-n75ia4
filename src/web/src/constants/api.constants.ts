/**
 * API Constants
 * @description Centralized API-related constants for the Task Management System
 * @version 1.0.0
 */

/**
 * Current API version identifier
 * Used as a prefix for all API endpoints
 */
export const API_VERSION = 'v1' as const;

/**
 * Base API endpoint paths
 * Centralized configuration of all service endpoints
 * @constant
 */
export const API_ENDPOINTS = {
  /** Authentication service endpoint */
  AUTH: `/api/${API_VERSION}/auth` as const,
  
  /** User management service endpoint */
  USERS: `/api/${API_VERSION}/users` as const,
  
  /** Project management service endpoint */
  PROJECTS: `/api/${API_VERSION}/projects` as const,
  
  /** Task management service endpoint */
  TASKS: `/api/${API_VERSION}/tasks` as const,
  
  /** File management service endpoint */
  FILES: `/api/${API_VERSION}/files` as const,
} as const;

/**
 * API rate limits (requests per minute)
 * Enforced by the API Gateway for each endpoint
 * @constant
 */
export const API_RATE_LIMITS = {
  /** Auth endpoint rate limit: 10 requests/minute */
  AUTH: 10 as const,
  
  /** Users endpoint rate limit: 20 requests/minute */
  USERS: 20 as const,
  
  /** Projects endpoint rate limit: 50 requests/minute */
  PROJECTS: 50 as const,
  
  /** Tasks endpoint rate limit: 100 requests/minute */
  TASKS: 100 as const,
  
  /** Files endpoint rate limit: 30 requests/minute */
  FILES: 30 as const,
} as const;

/**
 * Standard HTTP methods used for API requests
 * @constant
 */
export const HTTP_METHODS = {
  /** GET method for retrieving resources */
  GET: 'GET' as const,
  
  /** POST method for creating resources */
  POST: 'POST' as const,
  
  /** PUT method for updating resources */
  PUT: 'PUT' as const,
  
  /** DELETE method for removing resources */
  DELETE: 'DELETE' as const,
  
  /** PATCH method for partial updates */
  PATCH: 'PATCH' as const,
} as const;

/**
 * Standard HTTP status codes used in API responses
 * @constant
 */
export const HTTP_STATUS = {
  /** 200: Request succeeded */
  OK: 200 as const,
  
  /** 201: Resource created successfully */
  CREATED: 201 as const,
  
  /** 400: Invalid request parameters */
  BAD_REQUEST: 400 as const,
  
  /** 401: Authentication required */
  UNAUTHORIZED: 401 as const,
  
  /** 403: Insufficient permissions */
  FORBIDDEN: 403 as const,
  
  /** 404: Resource not found */
  NOT_FOUND: 404 as const,
  
  /** 500: Internal server error */
  INTERNAL_SERVER_ERROR: 500 as const,
  
  /** 503: Service temporarily unavailable */
  SERVICE_UNAVAILABLE: 503 as const,
} as const;

/**
 * Type definitions for API constants
 */
export type ApiVersion = typeof API_VERSION;
export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];
export type ApiRateLimit = typeof API_RATE_LIMITS[keyof typeof API_RATE_LIMITS];
export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

/**
 * Freeze all objects to prevent runtime modifications
 * This ensures immutability of the constants
 */
Object.freeze(API_ENDPOINTS);
Object.freeze(API_RATE_LIMITS);
Object.freeze(HTTP_METHODS);
Object.freeze(HTTP_STATUS);