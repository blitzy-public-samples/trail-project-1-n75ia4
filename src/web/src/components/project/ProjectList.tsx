/**
 * ProjectList Component
 * A responsive project list component implementing Material Design 3 principles
 * with virtualization, accessibility, and comprehensive filtering capabilities.
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual'; // ^10.0.0
import { useIntersectionObserver } from 'react-intersection-observer'; // ^9.0.0
import classNames from 'classnames'; // ^2.3.0

import ProjectCard from './ProjectCard';
import Pagination from '../common/Pagination';
import { Project, ProjectStatus, ProjectPriority } from '../../types/project.types';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

type ProjectSortKey = keyof Project;
type SortDirection = 'asc' | 'desc';

interface ProjectFilters {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  search?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

interface ProjectListProps {
  projects: Project[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onProjectClick?: (project: Project) => void;
  sortBy?: ProjectSortKey;
  sortDirection?: SortDirection;
  onSortChange?: (key: ProjectSortKey, direction: SortDirection) => void;
  filters?: ProjectFilters;
  onFilterChange?: (filters: ProjectFilters) => void;
  className?: string;
  loading?: boolean;
  error?: Error;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const GRID_BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  large: 1440,
};

const GRID_COLUMNS = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
  large: 4,
};

const CARD_GAP = 16;
const CONTAINER_PADDING = 24;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const ProjectList = memo<ProjectListProps>(({
  projects,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onProjectClick,
  sortBy,
  sortDirection,
  onSortChange,
  filters,
  onFilterChange,
  className,
  loading = false,
  error,
}) => {
  // State for container dimensions
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Calculate grid layout
  const gridLayout = useMemo(() => {
    const columns = containerWidth >= GRID_BREAKPOINTS.large ? GRID_COLUMNS.large :
                   containerWidth >= GRID_BREAKPOINTS.desktop ? GRID_COLUMNS.desktop :
                   containerWidth >= GRID_BREAKPOINTS.tablet ? GRID_COLUMNS.tablet :
                   GRID_COLUMNS.mobile;

    const cardWidth = (containerWidth - (CONTAINER_PADDING * 2) - (CARD_GAP * (columns - 1))) / columns;
    const rows = Math.ceil(projects.length / columns);

    return { columns, cardWidth, rows };
  }, [containerWidth, projects.length]);

  // Setup virtualization
  const rowVirtualizer = useVirtualizer({
    count: gridLayout.rows,
    getScrollElement: () => containerRef,
    estimateSize: useCallback(() => 300, []), // Estimated card height
    overscan: 2,
  });

  // Intersection observer for lazy loading
  const { ref: observerRef, inView } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Handle container resize
  useEffect(() => {
    if (!containerRef) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });

    resizeObserver.observe(containerRef);
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Memoized sorted and filtered projects
  const processedProjects = useMemo(() => {
    let result = [...projects];

    // Apply filters
    if (filters) {
      if (filters.status?.length) {
        result = result.filter(p => filters.status!.includes(p.status));
      }
      if (filters.priority?.length) {
        result = result.filter(p => filters.priority!.includes(p.priority));
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(p => 
          p.name.toLowerCase().includes(search) || 
          p.description.toLowerCase().includes(search)
        );
      }
      if (filters.dateRange?.start) {
        result = result.filter(p => new Date(p.startDate) >= filters.dateRange!.start!);
      }
      if (filters.dateRange?.end) {
        result = result.filter(p => new Date(p.endDate) <= filters.dateRange!.end!);
      }
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        const modifier = sortDirection === 'desc' ? -1 : 1;
        return aValue < bValue ? -1 * modifier : aValue > bValue ? 1 * modifier : 0;
      });
    }

    return result;
  }, [projects, filters, sortBy, sortDirection]);

  // Generate container classes
  const containerClasses = classNames(
    'project-list',
    {
      'project-list--loading': loading,
      'project-list--error': error,
    },
    className
  );

  return (
    <div className={containerClasses} role="region" aria-label="Project List">
      {/* Error Message */}
      {error && (
        <div className="project-list__error" role="alert">
          {error.message}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="project-list__loading" role="status">
          <span className="project-list__loading-text">Loading projects...</span>
        </div>
      )}

      {/* Project Grid */}
      <div
        ref={setContainerRef}
        className="project-list__grid"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * gridLayout.columns;
          const rowProjects = processedProjects.slice(rowStart, rowStart + gridLayout.columns);

          return (
            <div
              key={virtualRow.index}
              className="project-list__row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={onProjectClick ? () => onProjectClick(project) : undefined}
                  className="project-list__card"
                  style={{
                    width: gridLayout.cardWidth,
                    marginLeft: index > 0 ? `${CARD_GAP}px` : 0,
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Intersection Observer Target */}
      <div ref={observerRef} style={{ height: '1px' }} />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / pageSize)}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={onPageChange}
        className="project-list__pagination"
        disabled={loading}
        error={error?.message}
      />
    </div>
  );
});

// Display name for debugging
ProjectList.displayName = 'ProjectList';

export default ProjectList;