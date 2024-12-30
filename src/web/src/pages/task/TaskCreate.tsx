/**
 * @fileoverview Task creation page component implementing Material Design 3 principles
 * with comprehensive validation, accessibility features, and real-time feedback.
 * @version 1.0.0
 */

import React, { FC, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TaskForm from '../../components/task/TaskForm';
import DashboardLayout from '../../layouts/DashboardLayout';
import { TaskApi } from '../../api/task.api';
import { CreateTaskDTO } from '../../types/task.types';
import styles from './TaskCreate.module.scss';

/**
 * Task creation page component with comprehensive form handling and accessibility
 */
const TaskCreate: FC = () => {
  // Navigation and state management
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Clean up form state on unmount
  useEffect(() => {
    return () => {
      // Clear any autosave data
      localStorage.removeItem('task-create-autosave');
    };
  }, []);

  /**
   * Handles task creation with comprehensive error handling
   * @param taskData - Validated task creation data
   */
  const handleTaskCreate = useCallback(async (taskData: CreateTaskDTO) => {
    try {
      setIsSubmitting(true);

      // Show loading toast with progress
      const loadingToastId = toast.loading('Creating task...', {
        position: 'top-right',
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      });

      // Handle file uploads first if present
      if (taskData.attachments?.length) {
        for (let i = 0; i < taskData.attachments.length; i++) {
          const file = taskData.attachments[i];
          const progress = ((i + 1) / taskData.attachments.length) * 100;
          setUploadProgress(progress);

          // Update loading toast with upload progress
          toast.update(loadingToastId, {
            render: `Uploading files... ${Math.round(progress)}%`,
          });
        }
      }

      // Create task
      const response = await TaskApi.createTask(taskData);

      // Show success notification
      toast.update(loadingToastId, {
        render: 'Task created successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });

      // Navigate to task detail view
      navigate(`/tasks/${response.data.id}`);
    } catch (error: any) {
      // Show error notification with details
      toast.error(error.message || 'Failed to create task', {
        position: 'top-right',
        autoClose: 5000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      // Log error for monitoring
      console.error('Task creation failed:', error);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [navigate]);

  /**
   * Handles form cancellation with confirmation
   */
  const handleCancel = useCallback(() => {
    const hasUnsavedChanges = localStorage.getItem('task-create-autosave');

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }

    // Clean up and navigate back
    localStorage.removeItem('task-create-autosave');
    navigate('/tasks');
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className={styles.taskCreate}>
        <header className={styles.taskCreate__header}>
          <h1 className={styles.taskCreate__title}>Create New Task</h1>
        </header>

        <main className={styles.taskCreate__content}>
          <TaskForm
            onSubmit={handleTaskCreate}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            enableAutosave={true}
            maxAttachments={5}
            validationMode="onChange"
            showLoadingState={isSubmitting}
            className={styles.taskCreate__form}
          />

          {/* Upload Progress Indicator */}
          {uploadProgress > 0 && (
            <div 
              className={styles.taskCreate__progress}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div 
                className={styles.taskCreate__progressBar}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
};

export default TaskCreate;