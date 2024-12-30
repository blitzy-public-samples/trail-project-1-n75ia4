/**
 * @fileoverview TypeScript type definitions for project-related data structures
 * @version 1.0.0
 * @module types/project
 */

// External imports
import { UUID } from 'crypto'; // v20.0.0+

// Internal imports
import { User } from './user.types';

/**
 * Enum defining possible project status values
 * Used for project lifecycle tracking
 */
export enum ProjectStatus {
  PLANNED = 'PLANNED',           // Initial planning phase
  IN_PROGRESS = 'IN_PROGRESS',   // Active development/execution
  ON_HOLD = 'ON_HOLD',          // Temporarily paused
  COMPLETED = 'COMPLETED',       // Successfully finished
  CANCELLED = 'CANCELLED'        // Terminated before completion
}

/**
 * Enum defining project priority levels
 * Used for resource allocation and scheduling
 */
export enum ProjectPriority {
  LOW = 'LOW',           // Minimal urgency
  MEDIUM = 'MEDIUM',     // Standard priority
  HIGH = 'HIGH',         // Urgent priority
  CRITICAL = 'CRITICAL'  // Highest priority level
}

/**
 * Core interface defining the complete structure of a project entity
 * Maps to the project table schema in PostgreSQL
 */
export interface Project {
  id: UUID;                  // Unique project identifier
  name: string;              // Project name
  description: string;       // Detailed project description
  status: ProjectStatus;     // Current project status
  priority: ProjectPriority; // Project priority level
  ownerId: UUID;            // Project owner's user ID
  startDate: Date;          // Project start date
  endDate: Date;            // Project target completion date
  teamMembers: UUID[];      // Array of team member user IDs
  createdAt: Date;          // Project creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Data transfer object for project creation operations
 * Omits system-generated fields like id and timestamps
 */
export interface CreateProjectDTO {
  name: string;              // Required project name
  description: string;       // Required project description
  priority: ProjectPriority; // Required priority level
  startDate: Date;          // Required start date
  endDate: Date;            // Required end date
  teamMembers: UUID[];      // Optional initial team members
}

/**
 * Data transfer object for project update operations
 * All fields are optional to support partial updates
 */
export interface UpdateProjectDTO {
  name?: string;              // Optional name update
  description?: string;       // Optional description update
  status?: ProjectStatus;     // Optional status update
  priority?: ProjectPriority; // Optional priority update
  startDate?: Date;          // Optional start date update
  endDate?: Date;            // Optional end date update
  teamMembers?: UUID[];      // Optional team members update
}

/**
 * Interface for advanced project query parameters
 * Supports filtering, pagination, and sorting
 */
export interface ProjectQueryParams {
  status?: ProjectStatus;         // Filter by status
  priority?: ProjectPriority;     // Filter by priority
  ownerId?: UUID;                 // Filter by owner
  teamMemberId?: UUID;           // Filter by team member
  startDate?: Date;              // Filter by start date
  endDate?: Date;                // Filter by end date
  page?: number;                 // Pagination page number
  limit?: number;                // Items per page
  sortBy?: string;               // Sort field
  sortOrder?: 'asc' | 'desc';    // Sort direction
}