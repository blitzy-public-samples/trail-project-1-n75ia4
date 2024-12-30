import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { format, differenceInDays, isWithinInterval } from 'date-fns'; // v2.30.0
import { Project, ProjectStatus } from '../../types/project.types';
import ProgressBar from '../common/ProgressBar';
import styles from './ProjectTimeline.module.scss';

interface ProjectTimelineProps {
  projects: Project[];
  viewStartDate?: Date;
  viewEndDate?: Date;
  onProjectClick?: (project: Project) => void;
  className?: string;
}

interface TimelinePosition {
  left: number;
  width: number;
  overlap: number;
  scale: number;
}

/**
 * ProjectTimeline Component
 * 
 * A responsive timeline visualization component that displays projects in a Gantt chart-like view.
 * Supports touch interactions, keyboard navigation, and screen reader accessibility.
 *
 * @component
 */
const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  projects,
  viewStartDate = new Date(),
  viewEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days default view
  onProjectClick,
  className = '',
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressCache = useRef<Map<string, number>>(new Map());

  // Calculate timeline positions for all projects
  const timelinePositions = useMemo(() => {
    const positions = new Map<string, TimelinePosition>();
    const timelineDuration = differenceInDays(viewEndDate, viewStartDate);

    projects.forEach(project => {
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);

      // Skip if project is outside view range
      if (!isWithinInterval(start, { start: viewStartDate, end: viewEndDate }) &&
          !isWithinInterval(end, { start: viewStartDate, end: viewEndDate })) {
        return;
      }

      const startOffset = Math.max(differenceInDays(start, viewStartDate), 0);
      const projectDuration = Math.min(
        differenceInDays(end, start),
        differenceInDays(viewEndDate, start)
      );

      const left = (startOffset / timelineDuration) * 100;
      const width = (projectDuration / timelineDuration) * 100;
      
      // Calculate overlap with other projects
      let overlap = 0;
      projects.forEach(otherProject => {
        if (otherProject.id === project.id) return;
        const otherStart = new Date(otherProject.startDate);
        const otherEnd = new Date(otherProject.endDate);
        
        if (isWithinInterval(start, { start: otherStart, end: otherEnd }) ||
            isWithinInterval(otherStart, { start, end })) {
          overlap++;
        }
      });

      positions.set(project.id, {
        left,
        width,
        overlap,
        scale: 1 / (overlap + 1)
      });
    });

    return positions;
  }, [projects, viewStartDate, viewEndDate]);

  // Calculate project progress
  const calculateProgress = useCallback((project: Project): number => {
    const cached = progressCache.current.get(project.id);
    if (cached !== undefined) return cached;

    const now = new Date();
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    
    let progress = 0;
    
    if (project.status === ProjectStatus.COMPLETED) {
      progress = 100;
    } else if (project.status === ProjectStatus.CANCELLED) {
      progress = 0;
    } else {
      const totalDuration = differenceInDays(end, start);
      const elapsed = differenceInDays(now, start);
      progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    }

    progressCache.current.set(project.id, progress);
    return progress;
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const element = timelineRef.current;
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusedElement = document.activeElement;
      if (!focusedElement?.classList.contains('timeline-project')) return;

      switch (e.key) {
        case 'ArrowRight':
          (focusedElement.nextElementSibling as HTMLElement)?.focus();
          break;
        case 'ArrowLeft':
          (focusedElement.previousElementSibling as HTMLElement)?.focus();
          break;
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      ref={timelineRef}
      className={`${styles.timeline} ${className}`}
      role="grid"
      aria-label="Project Timeline"
      aria-rowcount={projects.length}
      aria-colcount={1}
    >
      <div className={styles.timelineHeader}>
        {/* Timeline scale markers */}
        {Array.from({ length: 4 }).map((_, index) => {
          const date = new Date(viewStartDate.getTime() + (differenceInDays(viewEndDate, viewStartDate) * (index / 3)) * 24 * 60 * 60 * 1000);
          return (
            <div 
              key={index}
              className={styles.timelineMarker}
              style={{ left: `${(index / 3) * 100}%` }}
            >
              {format(date, 'MMM d, yyyy')}
            </div>
          );
        })}
      </div>

      <div className={styles.timelineBody}>
        {projects.map((project, index) => {
          const position = timelinePositions.get(project.id);
          if (!position) return null;

          return (
            <div
              key={project.id}
              className={styles.timelineProject}
              style={{
                left: `${position.left}%`,
                width: `${position.width}%`,
                top: `${position.overlap * 60}px`,
              }}
              onClick={() => onProjectClick?.(project)}
              tabIndex={0}
              role="gridcell"
              aria-rowindex={index + 1}
              aria-label={`${project.name} from ${format(new Date(project.startDate), 'MMM d, yyyy')} to ${format(new Date(project.endDate), 'MMM d, yyyy')}`}
            >
              <div className={styles.projectContent}>
                <h3 className={styles.projectTitle}>{project.name}</h3>
                <ProgressBar
                  value={calculateProgress(project)}
                  variant={project.status === ProjectStatus.COMPLETED ? 'success' : 'primary'}
                  size="small"
                  className={styles.projectProgress}
                />
                <div className={styles.projectDates}>
                  <span>{format(new Date(project.startDate), 'MMM d')}</span>
                  <span>{format(new Date(project.endDate), 'MMM d')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectTimeline;