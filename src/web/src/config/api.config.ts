/**
 * API Configuration
 * @description Configuration for API client with enhanced security, error handling, and retry mechanisms
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // v1.6.0
import {
  API_ENDPOINTS,
  API_VERSION,
  HTTP_METHODS,
  HTTP_STATUS
} from '../constants/api.constants';
import {
  ApiResponse,
  ApiError,
  QueryParams,
  EnhancedRequestConfig,
  ApiErrorCode,
  ResponseStatus
} from '../types/api.types';

// Environment-based configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const TOKEN_REFRESH_BUFFER = 300000; // 5 minutes before token expiry

/**
 * Base API configuration object
 */
export const apiConfig: EnhancedRequestConfig = {
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Version': API_VERSION,
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0'
  },
  retry: {
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY
  }
};

// Request queue for handling token refresh
let isRefreshing = false;
const requestQueue: Array<(token: string) => void> = [];

/**
 * Creates and configures an axios instance with enhanced security and error handling
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create(apiConfig);

  // Request interceptor for authentication and request queuing
  instance.interceptors.request.use(
    async (config) => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const expiresIn = tokenData.exp * 1000 - Date.now();

        // Check if token needs refresh
        if (expiresIn < TOKEN_REFRESH_BUFFER) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const newToken = await refreshAuthToken();
              config.headers.Authorization = `Bearer ${newToken}`;
              processRequestQueue(newToken);
            } catch (error) {
              processRequestQueue(null);
              throw error;
            } finally {
              isRefreshing = false;
            }
          } else {
            // Queue the request
            return new Promise((resolve) => {
              requestQueue.push((token: string) => {
                config.headers.Authorization = `Bearer ${token}`;
                resolve(config);
              });
            });
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Add security headers
      config.headers['X-Request-ID'] = crypto.randomUUID();
      config.headers['X-Timestamp'] = new Date().toISOString();

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and retries
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as EnhancedRequestConfig;
      
      // Skip retry for specific status codes
      if (
        error.response?.status === HTTP_STATUS.UNAUTHORIZED ||
        error.response?.status === HTTP_STATUS.FORBIDDEN ||
        !config.retry
      ) {
        return Promise.reject(handleApiError(error));
      }

      config.retry.maxRetries = config.retry.maxRetries ?? MAX_RETRIES;
      config.retry.retryCount = config.retry.retryCount ?? 0;

      // Implement exponential backoff
      if (config.retry.retryCount < config.retry.maxRetries) {
        config.retry.retryCount += 1;
        const backoffTime = Math.min(
          RETRY_DELAY * Math.pow(2, config.retry.retryCount - 1),
          10000
        );

        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return instance(config);
      }

      return Promise.reject(handleApiError(error));
    }
  );

  return instance;
};

/**
 * Processes API errors and transforms them into standardized format
 */
const handleApiError = (error: AxiosError): ApiError => {
  const timestamp = new Date().toISOString();
  const traceId = error.config?.headers?.['X-Request-ID'] || crypto.randomUUID();

  // Network or timeout errors
  if (!error.response) {
    return {
      message: 'Network error occurred',
      code: ApiErrorCode.INTERNAL_ERROR,
      status: 0,
      details: {
        originalError: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      },
      timestamp,
      traceId
    };
  }

  // API response errors
  const response = error.response;
  const status = response.status;
  let code = ApiErrorCode.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';

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
      message = 'Rate limit exceeded';
      break;
  }

  return {
    message,
    code,
    status,
    details: {
      data: response.data,
      headers: response.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    },
    timestamp,
    traceId
  };
};

/**
 * Handles authentication token refresh with queuing mechanism
 */
const refreshAuthToken = async (): Promise<string> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await axios.post<ApiResponse<{ accessToken: string }>>(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH}/refresh`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': API_VERSION
        }
      }
    );

    const newToken = response.data.data.accessToken;
    localStorage.setItem('accessToken', newToken);
    return newToken;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw error;
  }
};

/**
 * Process queued requests after token refresh
 */
const processRequestQueue = (token: string | null) => {
  requestQueue.forEach(callback => {
    if (token) {
      callback(token);
    }
  });
  requestQueue.length = 0;
};

// Create and export the configured API client instance
export const apiClient = createApiClient();

// Export utility functions for direct usage
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    apiClient.get<ApiResponse<T>>(url, config),
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.post<ApiResponse<T>>(url, data, config),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.put<ApiResponse<T>>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<ApiResponse<T>>(url, config),
  refreshToken: refreshAuthToken
};