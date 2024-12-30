import React, { useCallback, memo } from 'react';
import { format } from 'date-fns'; // v2.30.0
import classNames from 'classnames'; // v2.3.2
import { useDraggable } from '@dnd-kit/core'; // v6.0.0

import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import { useTheme } from '../../hooks/useTheme';

import styles from './TaskCard.module.css';

/**
 * Props interface for TaskCard component with accessibility and theme support
 */
interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => Promise<void>;
  className?: string;
  isDraggable?: boolean;
  isHighContrast?: boolean;
}

/**
 * Maps task status to theme-aware badge variant
 */
const getStatusVariant = (status: TaskStatus, isHighContrast: boolean): string => {
  const variants = {
    [TaskStatus.TODO]: isHighContrast ? 'neutral-high' : 'neutral',
    [TaskStatus.IN_PROGRESS]: isHighContrast ? 'primary-high' : 'primary',
    [TaskStatus.REVIEW]: isHighContrast ? 'warning-high' : 'warning',
    [TaskStatus.DONE]: isHighContrast ? 'success-high' : 'success'
  };
  return variants[status];
};

/**
 * Maps task priority to theme-aware badge variant
 */
const getPriorityVariant = (priority: TaskPriority, isHighContrast: boolean): string => {
  const variants = {
    [TaskPriority.LOW]: isHighContrast ? 'info-high' : 'info',
    [TaskPriority.MEDIUM]: isHighContrast ? 'warning-high' : 'warning',
    [TaskPriority.HIGH]: isHighContrast ? 'error-high' : 'error'
  };
  return variants[priority];
};

/**
 * Advanced task card component with full accessibility and interaction support
 */
const TaskCard: React.FC<TaskCardProps> = memo(({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  className,
  isDraggable = true,
  isHighContrast = false
}) => {
  // Theme and drag-drop hooks
  const { themeMode, contrastRatio } = useTheme();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: !isDraggable
  });

  // Memoized event handlers
  const handleEdit = useCallback(() => {
    onEdit(task.id);
  }, [task.id, onEdit]);

  const handleDelete = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  }, [task.id, onDelete]);

  const handleStatusChange = useCallback(async () => {
    const nextStatus = {
      [TaskStatus.TODO]: TaskStatus.IN_PROGRESS,
      [TaskStatus.IN_PROGRESS]: TaskStatus.REVIEW,
      [TaskStatus.REVIEW]: TaskStatus.DONE,
      [TaskStatus.DONE]: TaskStatus.TODO
    }[task.status];

    try {
      await onStatusChange(task.id, nextStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [task.id, task.status, onStatusChange]);

  // Drag transform styles
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: 'transform 200ms ease'
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      className={classNames(styles.taskCard, className, {
        [styles.isDraggable]: isDraggable,
        [styles.highContrast]: isHighContrast,
        [styles.darkMode]: themeMode === 'dark'
      })}
      style={style}
      role="article"
      aria-label={`Task: ${task.title}`}
      {...attributes}
      {...listeners}
    >
      {/* Task Header */}
      <div className={styles.header}>
        <span 
          className={classNames(
            styles.badge,
            styles[getStatusVariant(task.status, isHighContrast)]
          )}
          role="status"
        >
          {task.status}
        </span>
        <span 
          className={classNames(
            styles.badge,
            styles[getPriorityVariant(task.priority, isHighContrast)]
          )}
          role="status"
          aria-label={`Priority: ${task.priority}`}
        >
          {task.priority}
        </span>
      </div>

      {/* Task Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>{task.title}</h3>
        <p className={styles.description}>{task.description}</p>
      </div>

      {/* Task Metadata */}
      <div className={styles.metadata}>
        <time 
          dateTime={task.dueDate.toISOString()}
          className={classNames(styles.dueDate, {
            [styles.overdue]: new Date() > task.dueDate
          })}
          aria-label="Due date"
        >
          {format(task.dueDate, 'MMM d, yyyy')}
        </time>
        {task.attachments.length > 0 && (
          <span 
            className={styles.attachments}
            aria-label={`${task.attachments.length} attachments`}
          >
            📎 {task.attachments.length}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div 
        className={styles.actions}
        role="toolbar"
        aria-label="Task actions"
      >
        <button
          onClick={handleStatusChange}
          className={styles.actionButton}
          aria-label="Change status"
        >
          ↻
        </button>
        <button
          onClick={handleEdit}
          className={styles.actionButton}
          aria-label="Edit task"
        >
          ✎
        </button>
        <button
          onClick={handleDelete}
          className={styles.actionButton}
          aria-label="Delete task"
        >
          ×
        </button>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;