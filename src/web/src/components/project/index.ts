/**
 * Project Components Barrel File
 * Centralizes exports of all project-related components implementing Material Design 3
 * and atomic design methodology for the task management system.
 * 
 * @version 1.0.0
 */

// Core project components with their TypeScript interfaces
export { default as ProjectCard, type ProjectCardProps } from './ProjectCard';
export { default as ProjectForm, type ProjectFormProps } from './ProjectForm';
export { default as ProjectList, type ProjectListProps } from './ProjectList';
export { default as ProjectTimeline, type ProjectTimelineProps } from './ProjectTimeline';

// Re-export project-related types for convenience
export type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectQueryParams,
  ProjectTimeline as ProjectTimelineData,
  ProjectResource,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectResponse,
  PaginatedProjectResponse
} from '../../types/project.types';

// Type guards for project-related enums
export {
  isProjectStatus,
  isProjectPriority
} from '../../types/project.types';