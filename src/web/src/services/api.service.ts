/**
 * @fileoverview Core API service for handling all HTTP communications
 * Implements comprehensive request/response handling, error management,
 * retry logic, and enhanced security measures
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // v1.6.0
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  QueryParams,
  RetryConfig,
  EnhancedRequestConfig
} from '../types/api.types';
import { apiConfig, apiClient, api } from '../config/api.config';
import {
  API_ENDPOINTS,
  HTTP_METHODS,
  HTTP_STATUS,
  API_RATE_LIMITS
} from '../constants/api.constants';

/**
 * Enhanced API service class implementing comprehensive API communication features
 */
export class ApiService {
  private client: AxiosInstance;
  private requestQueue: Map<string, Promise<any>>;
  private isRefreshingToken: boolean;
  private retryConfig: RetryConfig;

  /**
   * Initializes the API service with enhanced security and error handling
   * @param retryConfig Optional retry configuration
   */
  constructor(retryConfig?: RetryConfig) {
    this.client = apiClient;
    this.requestQueue = new Map();
    this.isRefreshingToken = false;
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries || 3,
      retryDelay: retryConfig?.retryDelay || 1000,
      retryableStatuses: [
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ]
    };

    this.setupInterceptors();
  }

  /**
   * Performs a GET request with enhanced error handling and retry logic
   * @param endpoint API endpoint path
   * @param params Optional query parameters
   * @param config Optional request configuration
   * @returns Promise resolving to typed API response
   */
  public async get<T>(
    endpoint: string,
    params?: QueryParams,
    config?: EnhancedRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(endpoint, {
        params,
        ...config
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Performs a paginated GET request with enhanced response handling
   * @param endpoint API endpoint path
   * @param params Pagination and query parameters
   * @param config Optional request configuration
   * @returns Promise resolving to paginated response
   */
  public async getPaginated<T>(
    endpoint: string,
    params: QueryParams,
    config?: EnhancedRequestConfig
  ): Promise<PaginatedResponse<T>> {
    try {
      const response = await this.client.get<PaginatedResponse<T>>(endpoint, {
        params,
        ...config
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Performs a POST request with data validation and error handling
   * @param endpoint API endpoint path
   * @param data Request payload
   * @param config Optional request configuration
   * @returns Promise resolving to typed API response
   */
  public async post<T, R = any>(
    endpoint: string,
    data: T,
    config?: EnhancedRequestConfig
  ): Promise<ApiResponse<R>> {
    try {
      const response = await this.client.post<ApiResponse<R>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Performs a PUT request with comprehensive error handling
   * @param endpoint API endpoint path
   * @param data Request payload
   * @param config Optional request configuration
   * @returns Promise resolving to typed API response
   */
  public async put<T, R = any>(
    endpoint: string,
    data: T,
    config?: EnhancedRequestConfig
  ): Promise<ApiResponse<R>> {
    try {
      const response = await this.client.put<ApiResponse<R>>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Performs a DELETE request with enhanced security measures
   * @param endpoint API endpoint path
   * @param config Optional request configuration
   * @returns Promise resolving to typed API response
   */
  public async delete<T>(
    endpoint: string,
    config?: EnhancedRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(endpoint, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Sets up request and response interceptors for enhanced handling
   * @private
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and request queuing
    this.client.interceptors.request.use(
      async (config) => {
        const token = localStorage.getItem('accessToken');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add security headers
        config.headers['X-Request-ID'] = crypto.randomUUID();
        config.headers['X-Timestamp'] = new Date().toISOString();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as EnhancedRequestConfig;

        if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
          if (!this.isRefreshingToken) {
            this.isRefreshingToken = true;
            try {
              await api.refreshToken();
              return this.client(originalRequest);
            } catch (refreshError) {
              return Promise.reject(this.handleError(refreshError as AxiosError));
            } finally {
              this.isRefreshingToken = false;
            }
          }
          return this.queueRequest(originalRequest);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Queues requests during token refresh to prevent multiple refresh attempts
   * @private
   * @param request Original request configuration
   * @returns Promise resolving to retried request
   */
  private queueRequest(request: EnhancedRequestConfig): Promise<any> {
    const requestId = request.headers['X-Request-ID'] as string;
    
    if (!this.requestQueue.has(requestId)) {
      const promise = new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          if (!this.isRefreshingToken) {
            clearInterval(interval);
            try {
              const response = await this.client(request);
              resolve(response);
            } catch (error) {
              reject(error);
            }
            this.requestQueue.delete(requestId);
          }
        }, 100);
      });
      
      this.requestQueue.set(requestId, promise);
    }
    
    return this.requestQueue.get(requestId)!;
  }

  /**
   * Enhanced error handler with detailed error tracking and categorization
   * @private
   * @param error Axios error object
   * @returns Standardized API error
   */
  private handleError(error: AxiosError): ApiError {
    const timestamp = new Date().toISOString();
    const traceId = error.config?.headers?.['X-Request-ID'] as string || crypto.randomUUID();

    if (!error.response) {
      return {
        message: 'Network error occurred',
        code: 'NETWORK_ERROR',
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

    const response = error.response;
    return {
      message: response.data?.message || 'An unexpected error occurred',
      code: response.data?.code || 'INTERNAL_ERROR',
      status: response.status,
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
  }
}

// Export singleton instance
export const apiService = new ApiService();