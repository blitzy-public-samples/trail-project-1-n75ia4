/**
 * @fileoverview Task editing page component implementing Material Design 3 principles
 * with comprehensive validation, accessibility features, and optimistic updates.
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import TaskForm from '../../components/task/TaskForm';
import { useNotification } from '../../hooks/useNotification';
import { 
  updateTask, 
  selectTaskById,
  selectTaskLoadingStates 
} from '../../redux/task/taskSlice';
import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import styles from './TaskEdit.module.scss';

// Interface for component state tracking
interface TaskEditState {
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * TaskEdit component for editing existing tasks with comprehensive validation,
 * accessibility features, and optimistic updates.
 */
const TaskEdit: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { showNotification } = useNotification();

  // Redux selectors
  const task = useSelector((state) => selectTaskById(state, taskId));
  const loadingStates = useSelector(selectTaskLoadingStates);

  // Local state management
  const [formState, setFormState] = useState<TaskEditState>({
    isDirty: false,
    isValid: true,
    isSubmitting: false
  });

  // Handle non-existent task
  useEffect(() => {
    if (!task && !loadingStates.fetchTask) {
      showNotification({
        message: 'Task not found',
        type: 'error',
        duration: 5000
      });
      navigate('/tasks');
    }
  }, [task, loadingStates.fetchTask, navigate, showNotification]);

  // Handle form state changes
  const handleFormStateChange = useCallback((state: Partial<TaskEditState>) => {
    setFormState(prev => ({ ...prev, ...state }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (formData: Partial<Task>) => {
    if (!taskId) return;

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Dispatch update with optimistic UI update
      await dispatch(updateTask({ 
        id: taskId, 
        updates: formData 
      })).unwrap();

      showNotification({
        message: 'Task updated successfully',
        type: 'success',
        duration: 3000
      });

      navigate('/tasks');
    } catch (error) {
      showNotification({
        message: error.message || 'Failed to update task',
        type: 'error',
        duration: 5000
      });
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [dispatch, taskId, navigate, showNotification]);

  // Handle cancellation
  const handleCancel = useCallback(() => {
    if (formState.isDirty) {
      // Show confirmation dialog
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate('/tasks');
  }, [navigate, formState.isDirty]);

  // Early return for loading state
  if (loadingStates.fetchTask) {
    return (
      <div 
        className={styles.loadingContainer}
        role="alert" 
        aria-busy="true"
      >
        <span className="sr-only">Loading task details...</span>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  // Early return if task not found
  if (!task) {
    return null;
  }

  return (
    <div 
      className={styles.taskEditContainer}
      role="main"
      aria-labelledby="task-edit-title"
    >
      <header className={styles.header}>
        <h1 id="task-edit-title" className={styles.title}>
          Edit Task
        </h1>
      </header>

      <TaskForm
        initialData={task}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={formState.isSubmitting}
        enableAutosave={true}
        validationMode="onChange"
        showLoadingState={loadingStates.updateTask}
        onDirtyChange={(isDirty) => handleFormStateChange({ isDirty })}
        className={styles.form}
      />

      {/* Accessibility announcement for screen readers */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {formState.isSubmitting ? 'Saving changes...' : ''}
      </div>
    </div>
  );
};

export default TaskEdit;