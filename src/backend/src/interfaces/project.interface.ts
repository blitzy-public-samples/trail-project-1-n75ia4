/**
 * @fileoverview Core interfaces for project-related entities and operations in the task management system
 * @version 1.0.0
 * @module interfaces/project
 */

// External imports
import { UUID } from 'crypto'; // v20.0.0+

// Internal imports
import { ProjectStatus, ProjectPriority } from '../types/project.types';

/**
 * Core interface defining the structure of a project entity with validation constraints
 * Implements the project organization requirements from technical specifications
 */
export interface IProject {
  id: UUID;
  
  /**
   * Project name with validation constraints
   * @minLength 3
   * @maxLength 100
   */
  name: string;
  
  /**
   * Detailed project description
   * @maxLength 1000
   * @optional
   */
  description?: string;
  
  /**
   * Current project status
   * @see ProjectStatus enum
   */
  status: ProjectStatus;
  
  /**
   * Project priority level
   * @see ProjectPriority enum
   */
  priority: ProjectPriority;
  
  /**
   * Project owner's user ID
   */
  ownerId: UUID;
  
  /**
   * Project start date
   * @validation Must be a valid date
   */
  startDate: Date;
  
  /**
   * Project end date
   * @validation Must be after startDate
   */
  endDate: Date;
  
  /**
   * Array of team member user IDs
   * @minItems 1
   * @maxItems 100
   */
  teamMembers: UUID[];
  
  /**
   * Project creation timestamp
   * @readonly
   */
  createdAt: Date;
  
  /**
   * Last update timestamp
   * @readonly
   */
  updatedAt: Date;
}

/**
 * Interface for project creation data transfer object
 * Omits system-generated fields and enforces required fields
 */
export interface ICreateProjectDTO {
  name: string;
  description?: string;
  priority: ProjectPriority;
  startDate: Date;
  endDate: Date;
  teamMembers: UUID[];
}

/**
 * Interface for project update data transfer object
 * All fields are optional to support partial updates
 */
export interface IUpdateProjectDTO {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date;
  endDate?: Date;
  teamMembers?: UUID[];
}

/**
 * Interface defining project service operations contract
 * Includes validation and error handling specifications
 */
export interface IProjectService {
  /**
   * Creates a new project with validation
   * @throws {ValidationError} When validation fails
   * @throws {DatabaseError} When database operation fails
   * @throws {UnauthorizedError} When user lacks permissions
   */
  createProject(data: ICreateProjectDTO): Promise<IProject>;
  
  /**
   * Updates an existing project with validation
   * @throws {ValidationError} When validation fails
   * @throws {NotFoundError} When project not found
   * @throws {DatabaseError} When database operation fails
   * @throws {UnauthorizedError} When user lacks permissions
   */
  updateProject(id: UUID, data: IUpdateProjectDTO): Promise<IProject>;
  
  /**
   * Retrieves a project by ID
   * @throws {NotFoundError} When project not found
   * @throws {UnauthorizedError} When user lacks permissions
   */
  getProjectById(id: UUID): Promise<IProject>;
  
  /**
   * Deletes a project by ID
   * @throws {NotFoundError} When project not found
   * @throws {UnauthorizedError} When user lacks permissions
   * @throws {DatabaseError} When database operation fails
   */
  deleteProject(id: UUID): Promise<void>;
  
  /**
   * Lists projects based on query parameters
   * @throws {ValidationError} When query parameters are invalid
   * @throws {UnauthorizedError} When user lacks permissions
   */
  listProjects(params: IProjectQueryParams): Promise<{ data: IProject[]; total: number }>;
}

/**
 * Interface for project query parameters with validation constraints
 * Supports filtering, pagination, and sorting
 */
export interface IProjectQueryParams {
  /**
   * Filter by project status
   * @optional
   */
  status?: ProjectStatus;
  
  /**
   * Filter by project priority
   * @optional
   */
  priority?: ProjectPriority;
  
  /**
   * Filter by project owner
   * @optional
   */
  ownerId?: UUID;
  
  /**
   * Filter by team member
   * @optional
   */
  teamMemberId?: UUID;
  
  /**
   * Filter by start date
   * @validation Must be valid date
   * @optional
   */
  startDate?: Date;
  
  /**
   * Filter by end date
   * @validation Must be after startDate if provided
   * @optional
   */
  endDate?: Date;
  
  /**
   * Page number for pagination
   * @minimum 1
   */
  page: number;
  
  /**
   * Items per page
   * @minimum 1
   * @maximum 100
   */
  limit: number;
  
  /**
   * Field to sort by
   * @validation Must be valid project field
   * @optional
   */
  sortBy?: string;
  
  /**
   * Sort direction
   * @values 'asc' | 'desc'
   * @optional
   */
  sortOrder?: 'asc' | 'desc';
}