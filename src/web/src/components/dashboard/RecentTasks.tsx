import React, { useEffect, useState, useCallback, useRef, memo } from 'react'; // v18.2.0
import { format, formatInTimeZone } from 'date-fns-tz'; // v2.0.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import debounce from 'lodash/debounce'; // v4.17.21

import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import TaskCard from '../task/TaskCard';
import { taskApi } from '../../api/task.api';
import useTheme from '../../hooks/useTheme';

/**
 * Custom hook for managing task fetching logic with caching and real-time updates
 */
const useTaskFetching = (
  limit: number,
  autoRefresh: boolean,
  refreshInterval: number
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced fetch function to prevent excessive API calls
  const fetchTasks = useCallback(
    debounce(async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const response = await taskApi.getTasks({
          limit,
          sort: 'updatedAt',
          order: 'desc'
        });

        setTasks(response.data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    }, 300),
    [limit]
  );

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const intervalId = setInterval(fetchTasks, refreshInterval);
      return () => {
        clearInterval(intervalId);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchTasks]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
};

/**
 * Props interface for RecentTasks component
 */
interface RecentTasksProps {
  limit: number;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onTaskUpdate?: (task: Task) => void;
  errorBoundary?: boolean;
  timezone?: string;
}

/**
 * RecentTasks component displays a list of recent tasks with real-time updates
 * and comprehensive error handling
 */
const RecentTasks: React.FC<RecentTasksProps> = memo(({
  limit = 5,
  className,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onTaskUpdate,
  errorBoundary = true,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}) => {
  const { t } = useTranslation();
  const { isHighContrast } = useTheme();
  const { tasks, loading, error, refetch } = useTaskFetching(
    limit,
    autoRefresh,
    refreshInterval
  );

  // Handle task status changes with optimistic updates
  const handleStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) return;

      // Optimistic update
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status };
      setTasks(updatedTasks);

      // API update
      await taskApi.updateTask(taskId, { status });
      onTaskUpdate?.(updatedTasks[taskIndex]);
    } catch (err) {
      console.error('Failed to update task status:', err);
      refetch(); // Revert to server state on error
    }
  }, [tasks, onTaskUpdate, refetch]);

  // Handle task deletion
  const handleDelete = useCallback(async (taskId: string) => {
    try {
      await taskApi.deleteTask(taskId);
      refetch();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [refetch]);

  // Render loading skeleton
  if (loading) {
    return (
      <div className={className} role="status" aria-busy="true">
        {Array.from({ length: limit }).map((_, index) => (
          <div
            key={index}
            className="task-skeleton"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  // Render error state
  if (error && errorBoundary) {
    return (
      <div
        className="error-container"
        role="alert"
        aria-live="polite"
      >
        <p>{t('errors.taskFetch')}</p>
        <button
          onClick={() => refetch()}
          className="retry-button"
        >
          {t('actions.retry')}
        </button>
      </div>
    );
  }

  // Render task list
  return (
    <div
      className={className}
      role="region"
      aria-label={t('dashboard.recentTasks')}
    >
      {tasks.length === 0 ? (
        <p className="no-tasks" role="status">
          {t('dashboard.noTasks')}
        </p>
      ) : (
        <ul className="task-list">
          {tasks.map(task => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onEdit={() => {}} // Implement edit handler if needed
                isHighContrast={isHighContrast}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

RecentTasks.displayName = 'RecentTasks';

export default RecentTasks;