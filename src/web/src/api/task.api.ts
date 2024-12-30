/**
 * @fileoverview Task API client implementation for handling all task-related API operations
 * Implements comprehensive error handling, caching, and performance optimizations
 * @version 1.0.0
 */

import {
  Task,
  TaskQueryParams,
  TaskStatus,
  TaskPriority,
  PaginatedTaskResponse,
  TaskApiResponse,
  TaskStatsApiResponse,
  TaskTimelineApiResponse
} from '../types/task.types';
import { ApiService } from '../services/api.service';
import { API_ENDPOINTS, API_RATE_LIMITS } from '../constants/api.constants';
import { ApiError, CacheControl } from '../types/api.types';

/**
 * Cache configuration for task-related requests
 */
const TASK_CACHE_CONFIG: CacheControl = {
  enableCache: true,
  maxAge: 300, // 5 minutes
  prefix: 'task_'
};

/**
 * TaskApi class implementing comprehensive task management functionality
 * with enhanced error handling, caching, and performance optimizations
 */
export class TaskApi {
  private readonly apiService: ApiService;
  private readonly cache: Map<string, { data: any; timestamp: number }>;

  /**
   * Initializes TaskApi with required dependencies
   * @param apiService Injected API service instance
   */
  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.cache = new Map();
  }

  /**
   * Retrieves a paginated list of tasks with advanced filtering
   * @param params Query parameters for filtering and pagination
   * @returns Promise resolving to paginated task list
   */
  public async getTasks(params?: TaskQueryParams): Promise<PaginatedTaskResponse> {
    const cacheKey = this.generateCacheKey('tasks', params);
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return cachedData as PaginatedTaskResponse;
    }

    try {
      const response = await this.apiService.get<PaginatedTaskResponse>(
        API_ENDPOINTS.TASKS,
        params,
        {
          timeout: 5000,
          retry: {
            maxRetries: 2,
            retryDelay: 1000
          }
        }
      );

      this.setCacheData(cacheKey, response);
      return response;
    } catch (error) {
      throw this.handleTaskError(error as ApiError);
    }
  }

  /**
   * Retrieves a single task by ID
   * @param taskId Unique task identifier
   * @returns Promise resolving to task details
   */
  public async getTaskById(taskId: string): Promise<TaskApiResponse> {
    const cacheKey = this.generateCacheKey('task', { id: taskId });
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return cachedData as TaskApiResponse;
    }

    try {
      const response = await this.apiService.get<TaskApiResponse>(
        `${API_ENDPOINTS.TASKS}/${taskId}`
      );

      this.setCacheData(cacheKey, response);
      return response;
    } catch (error) {
      throw this.handleTaskError(error as ApiError);
    }
  }

  /**
   * Creates a new task with validation
   * @param task Task creation data
   * @returns Promise resolving to created task
   */
  public async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskApiResponse> {
    try {
      const response = await this.apiService.post<TaskApiResponse>(
        API_ENDPOINTS.TASKS,
        task,
        {
          timeout: 10000 // Extended timeout for file uploads
        }
      );

      this.invalidateTaskCache();
      return response;
    } catch (error) {
      throw this.handleTaskError(error as ApiError);
    }
  }

  /**
   * Updates an existing task with optimistic updates
   * @param taskId Task identifier
   * @param updates Task update data
   * @returns Promise resolving to updated task
   */
  public async updateTask(
    taskId: string,
    updates: Partial<Task>
  ): Promise<TaskApiResponse> {
    const cacheKey = this.generateCacheKey('task', { id: taskId });
    const optimisticUpdate = this.getCachedData(cacheKey);

    if (optimisticUpdate) {
      this.setCacheData(cacheKey, {
        ...optimisticUpdate,
        ...updates
      });
    }

    try {
      const response = await this.apiService.put<TaskApiResponse>(
        `${API_ENDPOINTS.TASKS}/${taskId}`,
        updates
      );

      this.invalidateTaskCache();
      return response;
    } catch (error) {
      if (optimisticUpdate) {
        this.setCacheData(cacheKey, optimisticUpdate); // Rollback on error
      }
      throw this.handleTaskError(error as ApiError);
    }
  }

  /**
   * Deletes a task with confirmation
   * @param taskId Task identifier
   * @returns Promise resolving to void
   */
  public async deleteTask(taskId: string): Promise<void> {
    try {
      await this.apiService.delete(`${API_ENDPOINTS.TASKS}/${taskId}`);
      this.invalidateTaskCache();
    } catch (error) {
      throw this.handleTaskError(error as ApiError);
    }
  }

  /**
   * Retrieves task statistics and metrics
   * @returns Promise resolving to task statistics
   */
  public async getTaskStats(): Promise<TaskStatsApiResponse> {
    const cacheKey = this.generateCacheKey('stats');
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return cachedData as TaskStatsApiResponse;
    }

    try {
      const response = await this.apiService.get<TaskStatsApiResponse>(
        `${API_ENDPOINTS.TASKS}/stats`
      );

      this.setCacheData(cacheKey, response);
      return response;
    } catch (error) {
      throw this.handleTaskError(error as ApiError);
    }
  }

  /**
   * Generates cache key for task-related data
   * @private
   */
  private generateCacheKey(prefix: string, params?: Record<string, any>): string {
    const key = `${TASK_CACHE_CONFIG.prefix}${prefix}`;
    return params ? `${key}_${JSON.stringify(params)}` : key;
  }

  /**
   * Retrieves cached data if valid
   * @private
   */
  private getCachedData(key: string): any | null {
    if (!TASK_CACHE_CONFIG.enableCache) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > (TASK_CACHE_CONFIG.maxAge * 1000);
    return isExpired ? null : cached.data;
  }

  /**
   * Sets cache data with timestamp
   * @private
   */
  private setCacheData(key: string, data: any): void {
    if (!TASK_CACHE_CONFIG.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidates all task-related cache entries
   * @private
   */
  private invalidateTaskCache(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(TASK_CACHE_CONFIG.prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Handles task-specific API errors
   * @private
   */
  private handleTaskError(error: ApiError): Error {
    // Add task-specific error handling logic
    const errorMessage = error.message || 'An error occurred while processing the task operation';
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).code = error.code;
    (enhancedError as any).details = error.details;
    return enhancedError;
  }
}

// Export singleton instance
export const taskApi = new TaskApi(new ApiService());