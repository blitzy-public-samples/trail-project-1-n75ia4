/**
 * ProjectList Page Component
 * Implements comprehensive project list view with advanced filtering, sorting,
 * pagination, accessibility features, and optimized performance.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../redux/store';
import {
  fetchProjects,
  selectProjects,
  selectProjectsLoading,
  selectProjectsError,
  selectProjectFilters,
  selectTotalPages,
  setFilters,
  clearFilters
} from '../../redux/project/projectSlice';
import ProjectList from '../../components/project/ProjectList';
import { Project, ProjectStatus, ProjectPriority } from '../../types/project.types';
import debounce from 'lodash/debounce';

// Constants
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_FIELD = 'updatedAt';
const DEFAULT_SORT_ORDER = 'desc';
const DEBOUNCE_DELAY = 300;
const INTERSECTION_THRESHOLD = 0.5;

/**
 * Enhanced ProjectListPage component with comprehensive features
 */
const ProjectListPage: React.FC = () => {
  // Hooks
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Redux state
  const projects = useAppSelector(selectProjects);
  const loading = useAppSelector(selectProjectsLoading);
  const error = useAppSelector(selectProjectsError);
  const filters = useAppSelector(selectProjectFilters);
  const totalPages = useAppSelector(selectTotalPages);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<ProjectPriority | null>(null);

  /**
   * Initialize filters from URL query parameters
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialFilters = {
      page: parseInt(params.get('page') || '1', 10),
      limit: parseInt(params.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      sortBy: params.get('sortBy') || DEFAULT_SORT_FIELD,
      sortOrder: (params.get('sortOrder') || DEFAULT_SORT_ORDER) as 'asc' | 'desc',
      status: params.get('status') as ProjectStatus || undefined,
      priority: params.get('priority') as ProjectPriority || undefined,
      search: params.get('search') || undefined
    };

    dispatch(setFilters(initialFilters));
  }, [dispatch, location.search]);

  /**
   * Fetch projects when filters change
   */
  useEffect(() => {
    dispatch(fetchProjects(filters));
  }, [dispatch, filters]);

  /**
   * Setup infinite scroll observer
   */
  useEffect(() => {
    if (loadingRef.current && !observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting && !loading && filters.page < totalPages) {
            dispatch(setFilters({ ...filters, page: filters.page + 1 }));
          }
        },
        { threshold: INTERSECTION_THRESHOLD }
      );

      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [dispatch, filters, loading, totalPages]);

  /**
   * Debounced search handler
   */
  const handleSearch = useCallback(
    debounce((term: string) => {
      dispatch(setFilters({ ...filters, search: term, page: 1 }));
      navigate({
        pathname: location.pathname,
        search: `?${new URLSearchParams({ ...filters, search: term, page: '1' }).toString()}`
      });
    }, DEBOUNCE_DELAY),
    [dispatch, filters, navigate]
  );

  /**
   * Handle project click navigation
   */
  const handleProjectClick = useCallback((project: Project) => {
    navigate(`/projects/${project.id}`, { state: { from: location } });
  }, [navigate, location]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((filterType: string, value: any) => {
    const newFilters = { ...filters, [filterType]: value, page: 1 };
    dispatch(setFilters(newFilters));
    navigate({
      pathname: location.pathname,
      search: `?${new URLSearchParams({ ...newFilters, page: '1' }).toString()}`
    });
  }, [dispatch, filters, navigate]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((field: string, direction: 'asc' | 'desc') => {
    dispatch(setFilters({ ...filters, sortBy: field, sortOrder: direction, page: 1 }));
  }, [dispatch, filters]);

  return (
    <div 
      className="project-list-page"
      role="main"
      aria-label="Project List Page"
    >
      {/* Header Section */}
      <header className="project-list-page__header">
        <h1>Projects</h1>
        <div className="project-list-page__actions">
          <button
            onClick={() => navigate('/projects/new')}
            className="btn btn--primary"
            aria-label="Create New Project"
          >
            Create Project
          </button>
        </div>
      </header>

      {/* Filters Section */}
      <section 
        className="project-list-page__filters"
        aria-label="Project Filters"
      >
        <input
          type="search"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleSearch(e.target.value);
          }}
          className="project-list-page__search"
          aria-label="Search Projects"
        />

        <select
          value={selectedStatus || ''}
          onChange={(e) => {
            const value = e.target.value as ProjectStatus || null;
            setSelectedStatus(value);
            handleFilterChange('status', value);
          }}
          className="project-list-page__filter"
          aria-label="Filter by Status"
        >
          <option value="">All Statuses</option>
          {Object.values(ProjectStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select
          value={selectedPriority || ''}
          onChange={(e) => {
            const value = e.target.value as ProjectPriority || null;
            setSelectedPriority(value);
            handleFilterChange('priority', value);
          }}
          className="project-list-page__filter"
          aria-label="Filter by Priority"
        >
          <option value="">All Priorities</option>
          {Object.values(ProjectPriority).map(priority => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>

        <button
          onClick={() => {
            dispatch(clearFilters());
            setSearchTerm('');
            setSelectedStatus(null);
            setSelectedPriority(null);
          }}
          className="btn btn--secondary"
          aria-label="Clear Filters"
        >
          Clear Filters
        </button>
      </section>

      {/* Error Message */}
      {error && (
        <div 
          className="project-list-page__error" 
          role="alert"
          aria-live="polite"
        >
          {error.message}
        </div>
      )}

      {/* Project List */}
      <ProjectList
        projects={projects}
        totalItems={totalPages * filters.limit}
        currentPage={filters.page}
        pageSize={filters.limit}
        onPageChange={(page) => handleFilterChange('page', page)}
        onProjectClick={handleProjectClick}
        sortBy={filters.sortBy as keyof Project}
        sortDirection={filters.sortOrder}
        onSortChange={handleSortChange}
        filters={{
          status: selectedStatus ? [selectedStatus] : undefined,
          priority: selectedPriority ? [selectedPriority] : undefined,
          search: searchTerm
        }}
        loading={loading}
        error={error}
      />

      {/* Loading Indicator */}
      <div 
        ref={loadingRef}
        className="project-list-page__loading"
        aria-hidden={!loading}
      >
        {loading && <span>Loading more projects...</span>}
      </div>
    </div>
  );
};

export default ProjectListPage;