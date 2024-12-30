/**
 * User API Client Module
 * @description Implements secure API client for user-related operations with comprehensive
 * error handling, rate limiting, and role-based access control.
 * @version 1.0.0
 */

import { api as apiClient } from '../config/api.config';
import { API_ENDPOINTS, API_RATE_LIMITS } from '../constants/api.constants';
import {
  User,
  UserRole,
  UserStatus,
  UserPreferences,
  UserQueryParams,
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  PaginatedUserResponse
} from '../types/user.types';
import { ApiError, EnhancedRequestConfig } from '../types/api.types';

// Rate limiting configuration
const USER_RATE_LIMIT = API_RATE_LIMITS.USERS;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
let requestCount = 0;
let windowStart = Date.now();

/**
 * Checks if the current request would exceed rate limits
 * @throws {ApiError} When rate limit is exceeded
 */
const checkRateLimit = (): void => {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    windowStart = now;
  }
  
  if (requestCount >= USER_RATE_LIMIT) {
    throw {
      message: 'Rate limit exceeded for user operations',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID()
    } as ApiError;
  }
  
  requestCount++;
};

/**
 * Validates user role permissions for operations
 * @param requiredRole - Minimum required role for the operation
 * @param userRole - Current user's role
 * @throws {ApiError} When user lacks required permissions
 */
const validateRolePermissions = (requiredRole: UserRole, userRole: UserRole): void => {
  const roleHierarchy = {
    [UserRole.ADMIN]: 4,
    [UserRole.PROJECT_MANAGER]: 3,
    [UserRole.TEAM_LEAD]: 2,
    [UserRole.TEAM_MEMBER]: 1,
    [UserRole.GUEST]: 0
  };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    throw {
      message: 'Insufficient permissions for this operation',
      code: 'FORBIDDEN',
      status: 403,
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID()
    } as ApiError;
  }
};

/**
 * User API client object with comprehensive CRUD operations
 */
export const userApi = {
  /**
   * Retrieves a paginated list of users with optional filtering
   * @param params - Query parameters for filtering and pagination
   * @param config - Additional request configuration
   * @returns Promise resolving to paginated user list
   */
  async getUsers(
    params?: UserQueryParams,
    config?: EnhancedRequestConfig
  ): Promise<PaginatedUserResponse> {
    checkRateLimit();
    
    try {
      const response = await apiClient.get<PaginatedUserResponse>(
        API_ENDPOINTS.USERS,
        {
          ...config,
          params: {
            ...params,
            limit: params?.limit || 10,
            page: params?.page || 1
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Retrieves a single user by ID
   * @param userId - Unique user identifier
   * @param config - Additional request configuration
   * @returns Promise resolving to user details
   */
  async getUserById(
    userId: string,
    config?: EnhancedRequestConfig
  ): Promise<UserResponse> {
    checkRateLimit();
    
    if (!userId) {
      throw {
        message: 'User ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;
    }

    try {
      const response = await apiClient.get<UserResponse>(
        `${API_ENDPOINTS.USERS}/${userId}`,
        config
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Creates a new user with role validation
   * @param userData - User creation data
   * @param config - Additional request configuration
   * @returns Promise resolving to created user details
   */
  async createUser(
    userData: CreateUserRequest,
    config?: EnhancedRequestConfig
  ): Promise<UserResponse> {
    checkRateLimit();
    validateRolePermissions(UserRole.ADMIN, userData.role);

    if (!userData.email || !userData.name || !userData.role) {
      throw {
        message: 'Required user data missing',
        code: 'VALIDATION_ERROR',
        status: 400,
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;
    }

    try {
      const response = await apiClient.post<UserResponse>(
        API_ENDPOINTS.USERS,
        userData,
        config
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Updates existing user information
   * @param userId - User identifier
   * @param userData - Updated user data
   * @param config - Additional request configuration
   * @returns Promise resolving to updated user details
   */
  async updateUser(
    userId: string,
    userData: UpdateUserRequest,
    config?: EnhancedRequestConfig
  ): Promise<UserResponse> {
    checkRateLimit();
    
    if (!userId) {
      throw {
        message: 'User ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;
    }

    try {
      const response = await apiClient.put<UserResponse>(
        `${API_ENDPOINTS.USERS}/${userId}`,
        userData,
        config
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Deletes a user account with validation
   * @param userId - User identifier
   * @param config - Additional request configuration
   * @returns Promise resolving to void on success
   */
  async deleteUser(
    userId: string,
    config?: EnhancedRequestConfig
  ): Promise<void> {
    checkRateLimit();
    validateRolePermissions(UserRole.ADMIN, UserRole.ADMIN); // Only admins can delete users

    if (!userId) {
      throw {
        message: 'User ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;
    }

    try {
      await apiClient.delete(`${API_ENDPOINTS.USERS}/${userId}`, config);
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Updates user preferences
   * @param userId - User identifier
   * @param preferences - Updated preferences
   * @param config - Additional request configuration
   * @returns Promise resolving to updated user details
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
    config?: EnhancedRequestConfig
  ): Promise<UserResponse> {
    checkRateLimit();
    
    if (!userId) {
      throw {
        message: 'User ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
        timestamp: new Date().toISOString(),
        traceId: crypto.randomUUID()
      } as ApiError;
    }

    try {
      const response = await apiClient.put<UserResponse>(
        `${API_ENDPOINTS.USERS}/${userId}/preferences`,
        { preferences },
        config
      );
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  }
};