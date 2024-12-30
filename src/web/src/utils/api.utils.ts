/**
 * API Utilities
 * @description Enhanced utility functions for API request handling, error management,
 * and response processing with advanced security and performance features.
 * @version 1.0.0
 */

import { AxiosError, AxiosResponse } from 'axios'; // v1.6.0
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  QueryParams,
  ApiErrorCode,
  ResponseStatus
} from '../types/api.types';
import { API_ENDPOINTS, HTTP_STATUS } from '../constants/api.constants';
import { apiClient } from '../config/api.config';

/**
 * Enhanced error handling utility that transforms API errors into a standardized format
 * with comprehensive error tracking and security considerations.
 * @param error - The axios error object
 * @returns Standardized API error object
 */
export const handleApiError = (error: AxiosError): ApiError => {
  const timestamp = new Date().toISOString();
  const traceId = crypto.randomUUID();

  // Handle network or timeout errors
  if (!error.response) {
    return {
      message: 'A network error occurred. Please check your connection.',
      code: ApiErrorCode.INTERNAL_ERROR,
      status: 0,
      details: {
        type: 'NetworkError',
        originalError: sanitizeErrorMessage(error.message),
        config: sanitizeRequestConfig(error.config)
      },
      timestamp,
      traceId
    };
  }

  // Handle API response errors
  const response = error.response;
  const status = response.status;
  let code = ApiErrorCode.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';

  // Map HTTP status codes to appropriate error codes and messages
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      code = ApiErrorCode.BAD_REQUEST;
      message = 'Invalid request parameters';
      break;
    case HTTP_STATUS.UNAUTHORIZED:
      code = ApiErrorCode.UNAUTHORIZED;
      message = 'Authentication required';
      break;
    case HTTP_STATUS.FORBIDDEN:
      code = ApiErrorCode.FORBIDDEN;
      message = 'Insufficient permissions';
      break;
    case HTTP_STATUS.NOT_FOUND:
      code = ApiErrorCode.NOT_FOUND;
      message = 'Resource not found';
      break;
    case 429:
      code = ApiErrorCode.RATE_LIMIT_EXCEEDED;
      message = 'Rate limit exceeded. Please try again later.';
      break;
  }

  // Log error with sensitive data removed
  console.error(`API Error [${traceId}]:`, {
    status,
    code,
    url: sanitizeUrl(error.config?.url),
    timestamp
  });

  return {
    message,
    code,
    status,
    details: {
      data: sanitizeErrorData(response.data),
      path: sanitizeUrl(error.config?.url),
      method: error.config?.method?.toUpperCase(),
      timestamp
    },
    timestamp,
    traceId
  };
};

/**
 * Enhanced query parameter formatting with support for complex filters,
 * field selection, and security measures.
 * @param params - Query parameters object
 * @returns Formatted and sanitized query string
 */
export const formatQueryParams = (params: QueryParams): string => {
  if (!params || typeof params !== 'object') {
    return '';
  }

  const queryParts: string[] = [];

  // Handle pagination parameters
  if (params.page && params.page > 0) {
    queryParts.push(`page=${encodeURIComponent(params.page)}`);
  }
  if (params.limit && params.limit > 0) {
    queryParts.push(`limit=${encodeURIComponent(Math.min(params.limit, 100))}`);
  }

  // Handle sorting parameters
  if (params.sort) {
    const sanitizedSort = sanitizeString(params.sort);
    const order = params.order === 'desc' ? 'desc' : 'asc';
    queryParts.push(`sort=${encodeURIComponent(sanitizedSort)}`);
    queryParts.push(`order=${encodeURIComponent(order)}`);
  }

  // Handle search parameter
  if (params.search) {
    queryParts.push(`search=${encodeURIComponent(sanitizeString(params.search))}`);
  }

  // Handle field selection
  if (Array.isArray(params.fields) && params.fields.length > 0) {
    const sanitizedFields = params.fields
      .map(field => sanitizeString(field))
      .join(',');
    queryParts.push(`fields=${encodeURIComponent(sanitizedFields)}`);
  }

  // Handle complex filters
  if (params.filter && typeof params.filter === 'object') {
    const filterString = JSON.stringify(sanitizeObject(params.filter));
    queryParts.push(`filter=${encodeURIComponent(filterString)}`);
  }

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
};

/**
 * Processes paginated API responses with performance optimization and data validation.
 * @param response - Axios response object containing paginated data
 * @returns Formatted and validated paginated response
 */
export const handlePaginatedResponse = <T>(
  response: AxiosResponse
): PaginatedResponse<T> => {
  const { data, headers } = response;

  // Validate response structure
  if (!data || !Array.isArray(data.items)) {
    throw new Error('Invalid response format');
  }

  // Extract pagination metadata
  const total = parseInt(headers['x-total-count'] || data.total || '0', 10);
  const page = parseInt(headers['x-page'] || data.page || '1', 10);
  const limit = parseInt(headers['x-limit'] || data.limit || '10', 10);

  // Calculate pagination statistics
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;

  // Validate and transform response data
  const items = data.items.map((item: T) => validateAndTransformItem<T>(item));

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext
  };
};

/**
 * Utility function to sanitize error messages
 * @param message - Raw error message
 * @returns Sanitized error message
 */
const sanitizeErrorMessage = (message: string): string => {
  // Remove potential sensitive data patterns
  return message
    .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '[EMAIL]')
    .replace(/\b\d{4}[-]?\d{4}[-]?\d{4}[-]?\d{4}\b/g, '[CARD]')
    .replace(/\b\d{9,}\b/g, '[ID]');
};

/**
 * Utility function to sanitize URLs
 * @param url - Raw URL string
 * @returns Sanitized URL string
 */
const sanitizeUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // Remove sensitive query parameters
    urlObj.searchParams.delete('token');
    urlObj.searchParams.delete('key');
    urlObj.searchParams.delete('password');
    return urlObj.toString();
  } catch {
    return url.split('?')[0]; // Fall back to simple query string removal
  }
};

/**
 * Utility function to sanitize request configuration
 * @param config - Request configuration object
 * @returns Sanitized configuration object
 */
const sanitizeRequestConfig = (config: any): object => {
  if (!config) return {};
  const { headers, method, url } = config;
  return {
    method,
    url: sanitizeUrl(url),
    headers: {
      'Content-Type': headers?.['Content-Type'],
      'Accept': headers?.['Accept']
    }
  };
};

/**
 * Utility function to sanitize error response data
 * @param data - Raw error response data
 * @returns Sanitized error data
 */
const sanitizeErrorData = (data: any): object => {
  if (!data) return {};
  // Remove sensitive fields and return safe data
  const { password, token, secret, ...safeData } = data;
  return safeData;
};

/**
 * Utility function to sanitize input strings
 * @param input - Raw input string
 * @returns Sanitized string
 */
const sanitizeString = (input: string): string => {
  return input.replace(/[<>{}]/g, '').trim();
};

/**
 * Utility function to sanitize objects recursively
 * @param obj - Input object
 * @returns Sanitized object
 */
const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[sanitizeString(key)] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      result[sanitizeString(key)] = sanitizeString(value);
    } else {
      result[sanitizeString(key)] = value;
    }
  }
  return result;
};

/**
 * Utility function to validate and transform response items
 * @param item - Response item
 * @returns Validated and transformed item
 */
const validateAndTransformItem = <T>(item: T): T => {
  // Add validation and transformation logic as needed
  return item;
};