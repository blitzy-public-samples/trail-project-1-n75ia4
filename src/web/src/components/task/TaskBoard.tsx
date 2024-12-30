import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'; // v13.1.1
import { useVirtual } from 'react-virtual'; // v2.10.4
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import classNames from 'classnames'; // v2.3.2

import TaskCard from './TaskCard';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Task, TaskStatus } from '../../types/task.types';
import { useTheme } from '../../hooks/useTheme';

import styles from './TaskBoard.module.css';

/**
 * Interface for TaskBoard component props with enhanced features
 */
interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, status: TaskStatus, optimisticUpdate: boolean) => Promise<void>;
  onError: (error: Error) => void;
  isLoading?: boolean;
  virtualizeThreshold?: number;
  className?: string;
}

/**
 * Status column configuration with accessibility labels
 */
const BOARD_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: TaskStatus.TODO, label: 'To Do' },
  { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { id: TaskStatus.REVIEW, label: 'Review' },
  { id: TaskStatus.DONE, label: 'Done' }
];

/**
 * Enhanced TaskBoard component with virtualization and real-time updates
 */
const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onTaskUpdate,
  onError,
  isLoading = false,
  virtualizeThreshold = 50,
  className
}) => {
  // Theme and WebSocket hooks
  const { themeMode, isHighContrast } = useTheme();
  const { subscribe, unsubscribe } = useWebSocket();

  // Optimistic updates state
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const previousTasksRef = useRef<Task[]>(tasks);

  // Column refs for virtualization
  const columnRefs = useRef<Record<TaskStatus, HTMLDivElement | null>>({
    [TaskStatus.TODO]: null,
    [TaskStatus.IN_PROGRESS]: null,
    [TaskStatus.REVIEW]: null,
    [TaskStatus.DONE]: null
  });

  /**
   * Memoized task grouping by status with optimistic updates
   */
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.DONE]: []
    };

    optimisticTasks.forEach(task => {
      groups[task.status].push(task);
    });

    // Sort tasks by priority and due date
    Object.values(groups).forEach(taskList => {
      taskList.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority.localeCompare(a.priority);
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    return groups;
  }, [optimisticTasks]);

  /**
   * Virtual lists for each column when task count exceeds threshold
   */
  const virtualLists = useMemo(() => {
    return Object.entries(groupedTasks).reduce((acc, [status, tasks]) => {
      if (tasks.length > virtualizeThreshold) {
        acc[status] = useVirtual({
          size: tasks.length,
          parentRef: { current: columnRefs.current[status as TaskStatus] },
          estimateSize: useCallback(() => 100, []), // Estimated task card height
          overscan: 5 // Number of items to render outside viewport
        });
      }
      return acc;
    }, {} as Record<string, ReturnType<typeof useVirtual>>);
  }, [groupedTasks, virtualizeThreshold]);

  /**
   * Handle drag end with optimistic updates and error handling
   */
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const taskId = draggableId;

    // Apply optimistic update
    setOptimisticTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    try {
      await onTaskUpdate(taskId, newStatus, true);
    } catch (error) {
      // Rollback optimistic update on error
      setOptimisticTasks(previousTasksRef.current);
      onError(error as Error);
    }
  }, [onTaskUpdate, onError]);

  /**
   * Subscribe to real-time task updates
   */
  useEffect(() => {
    const handleTaskUpdate = (updatedTask: Task) => {
      setOptimisticTasks(prev =>
        prev.map(task => task.id === updatedTask.id ? updatedTask : task)
      );
    };

    subscribe('task.update', handleTaskUpdate);
    return () => unsubscribe('task.update');
  }, [subscribe, unsubscribe]);

  /**
   * Update optimistic tasks when props change
   */
  useEffect(() => {
    setOptimisticTasks(tasks);
    previousTasksRef.current = tasks;
  }, [tasks]);

  return (
    <ErrorBoundary
      fallback={<div className={styles.error}>Error loading task board</div>}
      onError={onError}
    >
      <div
        className={classNames(styles.taskBoard, className, {
          [styles.darkMode]: themeMode === 'dark',
          [styles.highContrast]: isHighContrast,
          [styles.loading]: isLoading
        })}
        role="region"
        aria-label="Task Board"
        aria-busy={isLoading}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={styles.columns}>
            {BOARD_COLUMNS.map(({ id, label }) => (
              <Droppable key={id} droppableId={id}>
                {(provided, snapshot) => (
                  <div
                    ref={(el) => {
                      provided.innerRef(el);
                      columnRefs.current[id] = el;
                    }}
                    className={classNames(styles.column, {
                      [styles.isDraggingOver]: snapshot.isDraggingOver
                    })}
                    aria-label={label}
                  >
                    <h2 className={styles.columnHeader}>{label}</h2>
                    <div className={styles.taskList}>
                      {virtualLists[id] ? (
                        virtualLists[id].virtualItems.map(virtualRow => (
                          <Draggable
                            key={groupedTasks[id][virtualRow.index].id}
                            draggableId={groupedTasks[id][virtualRow.index].id}
                            index={virtualRow.index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  top: virtualRow.start,
                                  height: virtualRow.size
                                }}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <TaskCard
                                  task={groupedTasks[id][virtualRow.index]}
                                  isDragging={dragSnapshot.isDragging}
                                  isHighContrast={isHighContrast}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        groupedTasks[id].map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  isDragging={dragSnapshot.isDragging}
                                  isHighContrast={isHighContrast}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </ErrorBoundary>
  );
};

export default TaskBoard;