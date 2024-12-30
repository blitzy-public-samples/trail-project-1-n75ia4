import React, { useMemo, useEffect, useCallback } from 'react';
import classNames from 'classnames'; // v2.3.0
import ProgressBar from '../common/ProgressBar';
import { Project, ProjectStatus } from '../../types/project.types';

/**
 * Props interface for ProjectProgress component
 */
interface ProjectProgressProps {
  /** Array of projects to display progress for */
  projects: Project[];
  /** Optional CSS class name for styling */
  className?: string;
  /** Optional interval in milliseconds for progress updates */
  refreshInterval?: number;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error handler callback */
  onError?: (error: Error) => void;
}

/**
 * Calculates overall progress percentage for a project with enhanced accuracy
 * @param project Project object to calculate progress for
 * @returns Progress percentage between 0-100
 */
const calculateProjectProgress = (project: Project): number => {
  const now = new Date();
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);

  // Validate dates
  if (start > end) {
    console.warn('Invalid project dates: start date is after end date');
    return 0;
  }

  // Calculate total duration and elapsed time
  const totalDuration = end.getTime() - start.getTime();
  const elapsedTime = Math.min(now.getTime() - start.getTime(), totalDuration);

  // Calculate base progress percentage
  let progress = (elapsedTime / totalDuration) * 100;

  // Adjust progress based on project status
  switch (project.status) {
    case ProjectStatus.COMPLETED:
      progress = 100;
      break;
    case ProjectStatus.CANCELLED:
    case ProjectStatus.ON_HOLD:
      // Freeze progress at current state
      break;
    case ProjectStatus.PLANNED:
      progress = 0;
      break;
    default:
      // IN_PROGRESS uses calculated progress
      break;
  }

  return Math.min(Math.max(progress, 0), 100);
};

/**
 * Returns appropriate color variant based on project status with accessibility support
 * @param status Project status
 * @returns Material Design 3 color variant
 */
const getStatusColor = (status: ProjectStatus): 'primary' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return 'success';
    case ProjectStatus.IN_PROGRESS:
      return 'primary';
    case ProjectStatus.ON_HOLD:
      return 'warning';
    case ProjectStatus.CANCELLED:
      return 'error';
    default:
      return 'primary';
  }
};

/**
 * ProjectProgress Component
 * 
 * Displays project progress information with visual indicators and statistics
 * for active projects. Implements Material Design 3 principles for consistent UI/UX.
 */
export const ProjectProgress: React.FC<ProjectProgressProps> = React.memo(({
  projects,
  className,
  refreshInterval = 60000, // Default 1 minute refresh
  isLoading = false,
  onError
}) => {
  // Memoize sorted projects by priority and status
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // Sort by status priority first
      const statusOrder = {
        [ProjectStatus.IN_PROGRESS]: 0,
        [ProjectStatus.ON_HOLD]: 1,
        [ProjectStatus.PLANNED]: 2,
        [ProjectStatus.COMPLETED]: 3,
        [ProjectStatus.CANCELLED]: 4
      };
      
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then sort by priority
      return b.priority.localeCompare(a.priority);
    });
  }, [projects]);

  // Calculate progress for all projects
  const projectProgress = useMemo(() => {
    return sortedProjects.map(project => ({
      ...project,
      progress: calculateProjectProgress(project)
    }));
  }, [sortedProjects]);

  // Set up progress refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      try {
        // Recalculate progress
        projectProgress.forEach(project => {
          project.progress = calculateProjectProgress(project);
        });
      } catch (error) {
        onError?.(error as Error);
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, projectProgress, onError]);

  // Format date for display
  const formatDate = useCallback((date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  return (
    <section
      className={classNames('project-progress', className)}
      aria-label="Project Progress"
      aria-busy={isLoading}
    >
      <div className="project-progress__list">
        {projectProgress.map(project => (
          <div
            key={project.id}
            className="project-progress__item"
            aria-label={`${project.name} Progress`}
          >
            <div className="project-progress__header">
              <h3 className="project-progress__title">{project.name}</h3>
              <span className="project-progress__dates">
                {formatDate(project.startDate)} - {formatDate(project.endDate)}
              </span>
            </div>
            
            <ProgressBar
              value={project.progress}
              variant={getStatusColor(project.status)}
              size="medium"
              label={`${Math.round(project.progress)}%`}
              animated={project.status === ProjectStatus.IN_PROGRESS}
              ariaLabel={`${project.name} is ${Math.round(project.progress)}% complete`}
            />
            
            <div className="project-progress__footer">
              <span className="project-progress__status">
                Status: {project.status.replace('_', ' ')}
              </span>
              <span className="project-progress__priority">
                Priority: {project.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

ProjectProgress.displayName = 'ProjectProgress';

export default ProjectProgress;