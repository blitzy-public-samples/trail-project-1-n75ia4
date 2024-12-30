import React, { useCallback, useMemo, memo } from 'react'; // v18.2.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import classNames from 'classnames'; // v2.3.2

import TaskCard from './TaskCard';
import { useTheme } from '../../hooks/useTheme';
import { Task, TaskStatus, TaskPriority, TaskQueryParams } from '../../types/task.types';

import styles from './TaskList.module.css';

/**
 * Interface for sorting configuration
 */
interface SortConfig {
  field: keyof Task;
  direction: 'asc' | 'desc';
}

/**
 * Type for task action handlers
 */
type TaskAction = 'edit' | 'delete' | 'statusChange';

/**
 * Props interface for TaskList component with comprehensive options
 */
interface TaskListProps {
  tasks: Task[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
  sortConfig: SortConfig;
  filters: TaskQueryParams;
  onPageChange: (page: number) => void;
  onSortChange: (sortConfig: SortConfig) => void;
  onFilterChange: (filters: TaskQueryParams) => void;
  onTaskAction: (taskId: string, action: TaskAction) => void;
  className?: string;
}

/**
 * Custom hook for managing task list event handlers
 */
const useTaskListHandlers = (props: TaskListProps) => {
  const {
    onFilterChange,
    onSortChange,
    onTaskAction,
    filters,
    sortConfig
  } = props;

  // Debounced filter handler
  const handleFilterChange = useCallback((newFilters: Partial<TaskQueryParams>) => {
    onFilterChange({ ...filters, ...newFilters });
  }, [filters, onFilterChange]);

  // Sort handler
  const handleSortChange = useCallback((field: keyof Task) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction });
  }, [sortConfig, onSortChange]);

  // Task action handler
  const handleTaskAction = useCallback((taskId: string, action: TaskAction) => {
    onTaskAction(taskId, action);
  }, [onTaskAction]);

  return {
    handleFilterChange,
    handleSortChange,
    handleTaskAction
  };
};

/**
 * TaskList component with virtualization and accessibility support
 */
const TaskList: React.FC<TaskListProps> = memo((props) => {
  const {
    tasks,
    isLoading,
    error,
    className,
    pageSize,
    currentPage,
    totalItems
  } = props;

  // Theme context
  const { themeMode, isHighContrast } = useTheme();

  // Event handlers
  const {
    handleFilterChange,
    handleSortChange,
    handleTaskAction
  } = useTaskListHandlers(props);

  // Virtual list configuration
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 100, []), // Estimated task card height
    overscan: 5
  });

  // Memoized filter options
  const filterOptions = useMemo(() => ({
    status: Object.values(TaskStatus),
    priority: Object.values(TaskPriority)
  }), []);

  // Error boundary
  if (error) {
    return (
      <div 
        className={styles.error}
        role="alert"
        aria-live="assertive"
      >
        Error loading tasks: {error.message}
      </div>
    );
  }

  return (
    <div
      className={classNames(styles.taskList, className, {
        [styles.darkMode]: themeMode === 'dark',
        [styles.highContrast]: isHighContrast,
        [styles.loading]: isLoading
      })}
      role="region"
      aria-label="Task List"
      aria-busy={isLoading}
    >
      {/* Filter Controls */}
      <div className={styles.filters} role="search">
        <select
          onChange={(e) => handleFilterChange({ status: e.target.value as TaskStatus })}
          aria-label="Filter by status"
          className={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          {filterOptions.status.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select
          onChange={(e) => handleFilterChange({ priority: e.target.value as TaskPriority })}
          aria-label="Filter by priority"
          className={styles.filterSelect}
        >
          <option value="">All Priorities</option>
          {filterOptions.priority.map(priority => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>
      </div>

      {/* Virtualized Task List */}
      <div
        ref={parentRef}
        className={styles.virtualList}
        role="list"
        style={{
          height: `${pageSize * 100}px`, // Estimated height
          overflow: 'auto'
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <TaskCard
                task={tasks[virtualRow.index]}
                onStatusChange={(taskId) => handleTaskAction(taskId, 'statusChange')}
                onEdit={(taskId) => handleTaskAction(taskId, 'edit')}
                onDelete={(taskId) => handleTaskAction(taskId, 'delete')}
                isHighContrast={isHighContrast}
                className={styles.taskCard}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Controls */}
      <div className={styles.pagination} role="navigation" aria-label="Pagination">
        <button
          onClick={() => props.onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className={styles.pageButton}
        >
          ←
        </button>
        <span className={styles.pageInfo}>
          Page {currentPage} of {Math.ceil(totalItems / pageSize)}
        </span>
        <button
          onClick={() => props.onPageChange(currentPage + 1)}
          disabled={currentPage * pageSize >= totalItems}
          aria-label="Next page"
          className={styles.pageButton}
        >
          →
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div 
          className={styles.loadingOverlay}
          role="progressbar"
          aria-label="Loading tasks"
        >
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;