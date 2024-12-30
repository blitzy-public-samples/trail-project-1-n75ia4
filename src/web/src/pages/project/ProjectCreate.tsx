import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.0+
import ProjectForm from '../../components/project/ProjectForm';
import { projectApi } from '../../api/project.api';
import { useNotification } from '../../hooks/useNotification';
import { CreateProjectPayload, Project } from '../../types/project.types';
import styles from './ProjectCreate.module.scss';

/**
 * ProjectCreate component for creating new projects
 * Implements Material Design 3 principles and WCAG 2.1 Level AA compliance
 * 
 * @returns {JSX.Element} Project creation page component
 */
const ProjectCreate: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Hooks
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  /**
   * Handles project creation with comprehensive error handling and validation
   * @param {CreateProjectPayload} projectData - Project creation payload
   */
  const handleCreateProject = useCallback(async (projectData: CreateProjectPayload) => {
    setIsLoading(true);
    setValidationErrors({});

    try {
      // Validate project data
      projectApi.validateProjectData(projectData);

      // Create project with retry logic
      const response = await projectApi.createProject(projectData);

      // Show success notification with screen reader support
      showNotification({
        message: 'Project created successfully',
        type: 'success',
        ariaLive: 'polite',
        duration: 5000
      });

      // Navigate to project list
      navigate('/projects');

    } catch (error: any) {
      // Handle specific error types
      if (error.code === 'VALIDATION_ERROR') {
        setValidationErrors(error.details || {});
        showNotification({
          message: 'Please check the form for errors',
          type: 'error',
          ariaLive: 'assertive',
          duration: 7000
        });
      } else {
        showNotification({
          message: error.message || 'Failed to create project',
          type: 'error',
          ariaLive: 'assertive',
          duration: 7000
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, showNotification]);

  /**
   * Handles validation errors from the form component
   * @param {Record<string, string>} errors - Validation errors
   */
  const handleValidationError = useCallback((errors: Record<string, string>) => {
    setValidationErrors(errors);
  }, []);

  /**
   * Handles cancellation of project creation
   */
  const handleCancel = useCallback(() => {
    // Show confirmation dialog for unsaved changes
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/projects');
    }
  }, [navigate]);

  return (
    <div className={styles.container} role="main">
      <header className={styles.header}>
        <h1>Create New Project</h1>
        <p className={styles.subtitle}>
          Create a new project to organize tasks and collaborate with team members
        </p>
      </header>

      <div className={styles.content}>
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={handleCancel}
          isLoading={isLoading}
          onValidationError={handleValidationError}
          autoSave={true}
          autoSaveInterval={30000}
        />

        {/* Error summary for accessibility */}
        {Object.keys(validationErrors).length > 0 && (
          <div 
            className={styles.errorContainer}
            role="alert"
            aria-live="polite"
          >
            <h2>Please correct the following errors:</h2>
            <ul>
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div 
          className={styles.loadingOverlay}
          role="progressbar"
          aria-label="Creating project"
          aria-busy="true"
        >
          <div className={styles.loadingSpinner} />
        </div>
      )}
    </div>
  );
};

export default ProjectCreate;