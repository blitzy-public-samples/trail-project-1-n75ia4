import React, { useState, useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // v6.0.0
import { format, formatDistance } from 'date-fns'; // v2.30.0
import { Task, TaskStatus, TaskPriority, UpdateTaskDTO, TaskHistory } from '../../types/task.types';
import { useTheme } from '../../hooks/useTheme';

// Constants for component
const POLLING_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 3;
const AUTOSAVE_DELAY = 1000; // 1 second

interface TaskDetailState {
  task: Task | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  taskHistory: TaskHistory[];
  isRealTimeEnabled: boolean;
  retryCount: number;
}

/**
 * TaskDetail Component - Provides a detailed view of a task with real-time updates
 * and collaborative features. Implements WCAG 2.1 Level AA accessibility standards.
 */
const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { themeMode, isHighContrast } = useTheme();
  
  // Component state
  const [state, setState] = useState<TaskDetailState>({
    task: null,
    isLoading: true,
    error: null,
    isSaving: false,
    taskHistory: [],
    isRealTimeEnabled: true,
    retryCount: 0
  });

  // Refs for autosave and WebSocket
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket>();

  /**
   * Fetches task details with error handling and retries
   */
  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        task: data,
        isLoading: false,
        retryCount: 0
      }));

    } catch (error) {
      if (state.retryCount < MAX_RETRIES) {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          error: `Error loading task: ${error.message}. Retrying...`
        }));
        setTimeout(fetchTaskDetails, 1000 * (state.retryCount + 1));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Failed to load task after ${MAX_RETRIES} attempts`
        }));
      }
    }
  }, [taskId, state.retryCount]);

  /**
   * Updates task with optimistic updates and error recovery
   */
  const updateTask = useCallback(async (updates: Partial<UpdateTaskDTO>) => {
    if (!state.task) return;

    const originalTask = { ...state.task };
    
    try {
      setState(prev => ({
        ...prev,
        isSaving: true,
        task: { ...prev.task!, ...updates }
      }));

      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      setState(prev => ({
        ...prev,
        task: updatedTask,
        isSaving: false
      }));

    } catch (error) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        task: originalTask,
        isSaving: false,
        error: `Failed to update task: ${error.message}`
      }));
    }
  }, [taskId, state.task]);

  /**
   * Handles real-time updates via WebSocket
   */
  const setupWebSocket = useCallback(() => {
    if (!taskId || !state.isRealTimeEnabled) return;

    const ws = new WebSocket(`ws://${window.location.host}/api/ws/tasks/${taskId}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        task: { ...prev.task!, ...update },
        taskHistory: [...prev.taskHistory, update]
      }));
    };

    ws.onerror = () => {
      setState(prev => ({
        ...prev,
        isRealTimeEnabled: false,
        error: 'Real-time updates disconnected'
      }));
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [taskId, state.isRealTimeEnabled]);

  // Initial load and cleanup
  useEffect(() => {
    fetchTaskDetails();
    const cleanup = setupWebSocket();
    const pollInterval = setInterval(fetchTaskDetails, POLLING_INTERVAL);

    return () => {
      cleanup?.();
      clearInterval(pollInterval);
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [fetchTaskDetails, setupWebSocket]);

  // Handle status change with accessibility announcement
  const handleStatusChange = useCallback((newStatus: TaskStatus) => {
    updateTask({ status: newStatus });
    const announcement = `Task status updated to ${newStatus}`;
    document.getElementById('aria-live')?.setAttribute('aria-label', announcement);
  }, [updateTask]);

  if (state.isLoading) {
    return (
      <div role="alert" aria-busy="true" className="task-detail-loading">
        Loading task details...
      </div>
    );
  }

  if (state.error) {
    return (
      <div role="alert" className="task-detail-error">
        {state.error}
        <button onClick={fetchTaskDetails} aria-label="Retry loading task">
          Retry
        </button>
      </div>
    );
  }

  if (!state.task) {
    return (
      <div role="alert" className="task-detail-not-found">
        Task not found
      </div>
    );
  }

  return (
    <div 
      className={`task-detail ${themeMode}`}
      role="main"
      aria-label="Task Details"
    >
      <div id="aria-live" role="status" aria-live="polite" className="sr-only" />
      
      <header className="task-detail-header">
        <h1>{state.task.title}</h1>
        <div className="task-meta">
          <span>Created {formatDistance(new Date(state.task.createdAt), new Date(), { addSuffix: true })}</span>
          {state.isSaving && <span aria-live="polite">Saving changes...</span>}
        </div>
      </header>

      <section className="task-content" aria-label="Task Information">
        <div className="task-status">
          <label htmlFor="task-status">Status:</label>
          <select
            id="task-status"
            value={state.task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            aria-label="Task status"
          >
            {Object.values(TaskStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="task-priority">
          <label htmlFor="task-priority">Priority:</label>
          <select
            id="task-priority"
            value={state.task.priority}
            onChange={(e) => updateTask({ priority: e.target.value as TaskPriority })}
            aria-label="Task priority"
          >
            {Object.values(TaskPriority).map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>

        <div className="task-description">
          <label htmlFor="task-description">Description:</label>
          <textarea
            id="task-description"
            value={state.task.description}
            onChange={(e) => {
              if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
              }
              autosaveTimeoutRef.current = setTimeout(() => {
                updateTask({ description: e.target.value });
              }, AUTOSAVE_DELAY);
            }}
            aria-label="Task description"
          />
        </div>

        <div className="task-due-date">
          <label htmlFor="task-due-date">Due Date:</label>
          <input
            type="datetime-local"
            id="task-due-date"
            value={format(new Date(state.task.dueDate), "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => updateTask({ dueDate: new Date(e.target.value) })}
            aria-label="Task due date"
          />
        </div>
      </section>

      <section className="task-history" aria-label="Task History">
        <h2>History</h2>
        <ul>
          {state.taskHistory.map((history, index) => (
            <li key={index} className="history-item">
              {format(new Date(history.timestamp), 'PPpp')} - {history.description}
            </li>
          ))}
        </ul>
      </section>

      <div className="task-actions">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="secondary"
        >
          Back
        </button>
        <button
          onClick={() => setState(prev => ({
            ...prev,
            isRealTimeEnabled: !prev.isRealTimeEnabled
          }))}
          aria-label={`${state.isRealTimeEnabled ? 'Disable' : 'Enable'} real-time updates`}
        >
          {state.isRealTimeEnabled ? 'Disable' : 'Enable'} Real-time Updates
        </button>
      </div>
    </div>
  );
};

export default TaskDetail;