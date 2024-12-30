import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@sentry/react';

// Internal Components
import TaskList from '../../components/task/TaskList';
import ProjectTimeline from '../../components/project/ProjectTimeline';

// Hooks
import useWebSocket from '../../hooks/useWebSocket';
import { useTheme } from '../../hooks/useTheme';

// Types
import { Project, ProjectStatus, ProjectQueryParams } from '../../types/project.types';
import { Task, TaskQueryParams } from '../../types/task.types';
import { ApiError } from '../../types/api.types';

// Constants
import { API_ENDPOINTS } from '../../constants/api.constants';

// Styles
import styles from './ProjectDetail.module.scss';

/**
 * Interface for component state
 */
interface ProjectDetailState {
  project: Project | null;
  tasks: Task[];
  loading: boolean;
  error: ApiError | null;
  taskQuery: TaskQueryParams;
  totalTasks: number;
  wsStatus: 'connected' | 'disconnected' | 'error';
}

/**
 * ProjectDetail Component
 * 
 * A comprehensive project detail page with real-time updates, task management,
 * and timeline visualization. Implements WCAG 2.1 Level AA accessibility standards.
 */
const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { themeMode, isHighContrast } = useTheme();

  // WebSocket connection for real-time updates
  const { 
    isConnected: wsConnected,
    subscribe,
    unsubscribe
  } = useWebSocket();

  // Component state
  const [state, setState] = useState<ProjectDetailState>({
    project: null,
    tasks: [],
    loading: true,
    error: null,
    taskQuery: {
      projectId,
      page: 1,
      limit: 10,
      sortBy: 'dueDate',
      sortOrder: 'asc'
    },
    totalTasks: 0,
    wsStatus: 'disconnected'
  });

  /**
   * Fetches project details with error handling
   */
  const fetchProjectDetails = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch project details');
      }

      setState(prev => ({
        ...prev,
        project: data.data,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as ApiError,
        loading: false
      }));
    }
  }, [projectId]);

  /**
   * Handles real-time project updates
   */
  const handleProjectUpdate = useCallback((update: any) => {
    setState(prev => ({
      ...prev,
      project: {
        ...prev.project!,
        ...update
      }
    }));
  }, []);

  /**
   * Handles task query parameter changes
   */
  const handleTaskQueryChange = useCallback((newQuery: Partial<TaskQueryParams>) => {
    setState(prev => ({
      ...prev,
      taskQuery: {
        ...prev.taskQuery,
        ...newQuery
      }
    }));
  }, []);

  /**
   * Handles task actions (edit, delete, status change)
   */
  const handleTaskAction = useCallback(async (taskId: string, action: string) => {
    try {
      // Implement optimistic update
      const updatedTasks = state.tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            status: action === 'statusChange' ? getNextStatus(task.status) : task.status
          };
        }
        return task;
      });

      setState(prev => ({
        ...prev,
        tasks: updatedTasks
      }));

      // Make API call based on action
      const response = await fetch(`${API_ENDPOINTS.TASKS}/${taskId}`, {
        method: action === 'delete' ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'statusChange' ? getNextStatus(state.tasks.find(t => t.id === taskId)?.status) : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        error: error as ApiError
      }));
    }
  }, [state.tasks]);

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (wsConnected && projectId) {
      subscribe(`project.${projectId}`, handleProjectUpdate);
      subscribe(`project.${projectId}.tasks`, handleProjectUpdate);

      setState(prev => ({ ...prev, wsStatus: 'connected' }));

      return () => {
        unsubscribe(`project.${projectId}`);
        unsubscribe(`project.${projectId}.tasks`);
      };
    }
  }, [wsConnected, projectId, subscribe, unsubscribe, handleProjectUpdate]);

  // Initial data fetch
  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  // Memoized project timeline data
  const timelineData = useMemo(() => ({
    startDate: state.project?.startDate || new Date(),
    endDate: state.project?.endDate || new Date(),
    tasks: state.tasks
  }), [state.project, state.tasks]);

  if (state.loading) {
    return (
      <div 
        className={styles.loading}
        role="status"
        aria-label="Loading project details"
      >
        <div className={styles.spinner} />
      </div>
    );
  }

  if (state.error) {
    return (
      <div 
        className={styles.error}
        role="alert"
        aria-live="assertive"
      >
        <h2>Error Loading Project</h2>
        <p>{state.error.message}</p>
        <button 
          onClick={fetchProjectDetails}
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className={styles.projectDetail}
      data-theme={themeMode}
      data-high-contrast={isHighContrast}
    >
      {/* Project Header */}
      <header className={styles.header}>
        <h1>{state.project?.name}</h1>
        <div className={styles.status}>
          <span 
            className={styles.statusBadge}
            data-status={state.project?.status}
          >
            {state.project?.status}
          </span>
          {state.wsStatus === 'connected' && (
            <span 
              className={styles.liveIndicator}
              aria-label="Real-time updates active"
            >
              Live
            </span>
          )}
        </div>
      </header>

      {/* Project Timeline */}
      <section 
        className={styles.timeline}
        aria-label="Project Timeline"
      >
        <ProjectTimeline
          projects={[state.project!]}
          viewStartDate={timelineData.startDate}
          viewEndDate={timelineData.endDate}
          onProjectClick={() => {}}
          className={styles.timelineComponent}
        />
      </section>

      {/* Task Management */}
      <section 
        className={styles.tasks}
        aria-label="Project Tasks"
      >
        <TaskList
          tasks={state.tasks}
          totalItems={state.totalTasks}
          currentPage={state.taskQuery.page || 1}
          pageSize={state.taskQuery.limit || 10}
          isLoading={state.loading}
          error={state.error}
          sortConfig={{
            field: state.taskQuery.sortBy as keyof Task,
            direction: state.taskQuery.sortOrder || 'asc'
          }}
          filters={state.taskQuery}
          onPageChange={(page) => handleTaskQueryChange({ page })}
          onSortChange={(sortConfig) => handleTaskQueryChange({
            sortBy: sortConfig.field,
            sortOrder: sortConfig.direction
          })}
          onFilterChange={handleTaskQueryChange}
          onTaskAction={handleTaskAction}
          className={styles.taskList}
        />
      </section>
    </div>
  );
};

/**
 * Helper function to determine next task status
 */
const getNextStatus = (currentStatus?: string): string => {
  const statusFlow: { [key: string]: string } = {
    'TODO': 'IN_PROGRESS',
    'IN_PROGRESS': 'REVIEW',
    'REVIEW': 'DONE',
    'DONE': 'TODO'
  };
  return statusFlow[currentStatus || 'TODO'];
};

// Export wrapped component with error boundary
export default function ProjectDetailWithErrorBoundary() {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div role="alert" className={styles.errorBoundary}>
          <h2>Something went wrong</h2>
          <pre>{error.message}</pre>
        </div>
      )}
    >
      <ProjectDetail />
    </ErrorBoundary>
  );
}