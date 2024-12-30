/**
 * @fileoverview Defines standardized HTTP status codes and their descriptions for consistent API response
 * handling across the Task Management System backend. Implements REST API best practices for status codes.
 * @version 1.0.0
 */

/**
 * Enum defining standard HTTP status codes used across the application.
 * Provides type-safe access to commonly used status codes for API responses.
 * @enum {number}
 */
export enum StatusCode {
  /** Successful request */
  OK = 200,
  
  /** Resource successfully created */
  CREATED = 201,
  
  /** Request successful with no content to return */
  NO_CONTENT = 204,
  
  /** Invalid request parameters or payload */
  BAD_REQUEST = 400,
  
  /** Authentication required or failed */
  UNAUTHORIZED = 401,
  
  /** Insufficient permissions for the requested resource */
  FORBIDDEN = 403,
  
  /** Requested resource does not exist */
  NOT_FOUND = 404,
  
  /** Request conflicts with current state */
  CONFLICT = 409,
  
  /** Unexpected server error occurred */
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Constant object providing human-readable descriptions for HTTP status codes.
 * Used for generating consistent error messages and API documentation.
 * @const {Record<string, string>}
 */
export const StatusCodeDescription: Readonly<Record<string, string>> = {
  '200': 'OK - Request successful',
  '201': 'Created - Resource successfully created',
  '204': 'No Content - Request successful with no content to return',
  '400': 'Bad Request - Invalid request parameters or payload',
  '401': 'Unauthorized - Authentication required or failed',
  '403': 'Forbidden - Insufficient permissions for the requested resource',
  '404': 'Not Found - Requested resource does not exist',
  '409': 'Conflict - Request conflicts with current state',
  '500': 'Internal Server Error - Unexpected server error occurred'
} as const;

/**
 * Type guard to check if a number is a valid StatusCode
 * @param {number} code - The status code to check
 * @returns {boolean} True if the code is a valid StatusCode
 */
export const isValidStatusCode = (code: number): code is StatusCode => {
  return Object.values(StatusCode).includes(code);
};

/**
 * Get the description for a status code
 * @param {StatusCode} code - The status code to get the description for
 * @returns {string} The description for the status code
 */
export const getStatusCodeDescription = (code: StatusCode): string => {
  return StatusCodeDescription[code.toString()] || 'Unknown Status Code';
};