/**
 * @fileoverview Project API module for handling all project-related HTTP requests
 * Implements comprehensive CRUD operations with enhanced security and error handling
 * @version 1.0.0
 */

import {
  Project,
  ProjectQueryParams,
  ProjectResponse,
  PaginatedProjectResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectTimeline,
  ProjectResource,
  isProjectStatus,
  isProjectPriority
} from '../types/project.types';
import { ApiService } from '../services/api.service';
import { API_ENDPOINTS, API_RATE_LIMITS } from '../constants/api.constants';
import { EnhancedRequestConfig } from '../types/api.types';

/**
 * Enhanced ProjectApi class implementing comprehensive project management functionality
 * with robust error handling, request queuing, and security measures
 */
export class ProjectApi {
  private readonly apiService: ApiService;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly requestTimeout: number;
  private readonly cache: Map<string, { data: any; timestamp: number }>;
  private readonly cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Initializes ProjectApi with enhanced security configuration
   * @param apiService Configured API service instance
   */
  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.baseUrl = API_ENDPOINTS.PROJECTS;
    this.maxRetries = 3;
    this.requestTimeout = 30000; // 30 seconds
    this.cache = new Map();
  }

  /**
   * Retrieves paginated list of projects with enhanced filtering and caching
   * @param params Query parameters for filtering and pagination
   * @returns Promise resolving to paginated project list
   */
  public async getProjects(
    params?: ProjectQueryParams
  ): Promise<PaginatedProjectResponse> {
    const cacheKey = `projects-${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      const response = await this.apiService.get<PaginatedProjectResponse>(
        this.baseUrl,
        params,
        config
      );
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves specific project by ID with enhanced validation
   * @param projectId Project identifier
   * @returns Promise resolving to project details
   */
  public async getProjectById(projectId: string): Promise<ProjectResponse> {
    if (!projectId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid project ID format');
    }

    const cacheKey = `project-${projectId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      const response = await this.apiService.get<ProjectResponse>(
        `${this.baseUrl}/${projectId}`,
        undefined,
        config
      );
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Creates new project with comprehensive validation
   * @param projectData Project creation payload
   * @returns Promise resolving to created project
   */
  public async createProject(projectData: CreateProjectPayload): Promise<ProjectResponse> {
    this.validateProjectData(projectData);

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      const response = await this.apiService.post<CreateProjectPayload, ProjectResponse>(
        this.baseUrl,
        projectData,
        config
      );
      this.invalidateProjectCache();
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates existing project with optimistic updates
   * @param projectId Project identifier
   * @param projectData Project update payload
   * @returns Promise resolving to updated project
   */
  public async updateProject(
    projectId: string,
    projectData: UpdateProjectPayload
  ): Promise<ProjectResponse> {
    if (!projectId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid project ID format');
    }

    this.validateProjectData(projectData, true);

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      const response = await this.apiService.put<UpdateProjectPayload, ProjectResponse>(
        `${this.baseUrl}/${projectId}`,
        projectData,
        config
      );
      this.invalidateProjectCache();
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletes project with proper cleanup
   * @param projectId Project identifier
   * @returns Promise resolving to void
   */
  public async deleteProject(projectId: string): Promise<void> {
    if (!projectId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid project ID format');
    }

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      await this.apiService.delete(
        `${this.baseUrl}/${projectId}`,
        config
      );
      this.invalidateProjectCache();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves project timeline data
   * @param projectId Project identifier
   * @returns Promise resolving to project timeline
   */
  public async getProjectTimeline(projectId: string): Promise<ProjectTimeline> {
    if (!projectId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid project ID format');
    }

    const cacheKey = `timeline-${projectId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      const response = await this.apiService.get<ProjectTimeline>(
        `${this.baseUrl}/${projectId}/timeline`,
        undefined,
        config
      );
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves project resource allocation data
   * @param projectId Project identifier
   * @returns Promise resolving to project resources
   */
  public async getProjectResources(projectId: string): Promise<ProjectResource[]> {
    if (!projectId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid project ID format');
    }

    const cacheKey = `resources-${projectId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const config: EnhancedRequestConfig = {
      retry: { maxRetries: this.maxRetries },
      timeout: this.requestTimeout
    };

    try {
      const response = await this.apiService.get<ProjectResource[]>(
        `${this.baseUrl}/${projectId}/resources`,
        undefined,
        config
      );
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validates project data before API operations
   * @private
   * @param data Project data to validate
   * @param isUpdate Whether this is an update operation
   */
  private validateProjectData(data: Partial<Project>, isUpdate: boolean = false): void {
    if (!isUpdate) {
      if (!data.name?.trim()) {
        throw new Error('Project name is required');
      }
      if (!data.ownerId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid owner ID format');
      }
    }

    if (data.status && !isProjectStatus(data.status)) {
      throw new Error('Invalid project status');
    }
    if (data.priority && !isProjectPriority(data.priority)) {
      throw new Error('Invalid project priority');
    }
    if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
      throw new Error('Start date cannot be after end date');
    }
  }

  /**
   * Retrieves data from cache if valid
   * @private
   * @param key Cache key
   * @returns Cached data or null
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    return null;
  }

  /**
   * Sets data in cache with timestamp
   * @private
   * @param key Cache key
   * @param data Data to cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidates all project-related cache entries
   * @private
   */
  private invalidateProjectCache(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('project-') || key.startsWith('projects-')) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const projectApi = new ProjectApi(new ApiService());