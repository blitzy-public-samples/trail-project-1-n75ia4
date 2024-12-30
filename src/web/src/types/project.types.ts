/**
 * @fileoverview TypeScript type definitions for project-related data structures,
 * interfaces and enums used throughout the frontend application.
 * @version 1.0.0
 */

import { ApiResponse, PaginatedResponse, QueryParams } from './api.types';

/**
 * Type-safe UUID string type for project and user identifiers
 */
type UUID = string;

/**
 * Enum defining all possible project status values
 * Used for tracking project lifecycle states
 */
export enum ProjectStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Enum defining project priority levels for resource allocation
 * Used for project prioritization and resource management
 */
export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Comprehensive interface defining the complete structure of a project entity
 * Includes all required fields and relationships for project management
 */
export interface Project {
  /** Unique project identifier */
  id: UUID;
  
  /** Project name */
  name: string;
  
  /** Detailed project description */
  description: string;
  
  /** Current project status */
  status: ProjectStatus;
  
  /** Project priority level */
  priority: ProjectPriority;
  
  /** Project owner's user ID */
  ownerId: UUID;
  
  /** Project start date */
  startDate: Date;
  
  /** Project end date */
  endDate: Date;
  
  /** Array of team member user IDs assigned to the project */
  teamMembers: UUID[];
  
  /** Project creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Extended query parameters interface for advanced project filtering
 * Extends base QueryParams with project-specific filtering options
 */
export interface ProjectQueryParams extends QueryParams {
  /** Filter by project status */
  status?: ProjectStatus;
  
  /** Filter by project priority */
  priority?: ProjectPriority;
  
  /** Filter by project owner */
  ownerId?: UUID;
  
  /** Filter by team member */
  teamMemberId?: UUID;
  
  /** Filter by start date */
  startDate?: Date;
  
  /** Filter by end date */
  endDate?: Date;
  
  /** Page number for pagination */
  page?: number;
  
  /** Number of items per page */
  limit?: number;
  
  /** Field to sort by */
  sortBy?: keyof Project;
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Type for project creation request payload
 */
export type CreateProjectPayload = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Type for project update request payload
 */
export type UpdateProjectPayload = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Type for project API response
 */
export type ProjectResponse = ApiResponse<Project>;

/**
 * Type for paginated project list response
 */
export type PaginatedProjectResponse = ApiResponse<PaginatedResponse<Project>>;

/**
 * Interface for project timeline data
 * Supports timeline visualization requirement
 */
export interface ProjectTimeline {
  /** Project identifier */
  projectId: UUID;
  
  /** Timeline milestones */
  milestones: {
    /** Milestone date */
    date: Date;
    /** Milestone title */
    title: string;
    /** Milestone description */
    description: string;
    /** Milestone completion status */
    completed: boolean;
  }[];
  
  /** Project duration in days */
  duration: number;
  
  /** Project progress percentage */
  progress: number;
}

/**
 * Interface for project resource allocation
 * Supports resource allocation requirement
 */
export interface ProjectResource {
  /** Team member user ID */
  userId: UUID;
  
  /** Allocation percentage (0-100) */
  allocation: number;
  
  /** Allocation start date */
  startDate: Date;
  
  /** Allocation end date */
  endDate: Date;
  
  /** Resource role in the project */
  role: string;
}

/**
 * Type guard to check if a value is a valid ProjectStatus
 */
export const isProjectStatus = (value: any): value is ProjectStatus => {
  return Object.values(ProjectStatus).includes(value);
};

/**
 * Type guard to check if a value is a valid ProjectPriority
 */
export const isProjectPriority = (value: any): value is ProjectPriority => {
  return Object.values(ProjectPriority).includes(value);
};