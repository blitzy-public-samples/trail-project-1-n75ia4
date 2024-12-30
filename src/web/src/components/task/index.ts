/**
 * @fileoverview Barrel file exporting task-related components implementing Material Design 3
 * principles and atomic design methodology. Provides centralized access to task management
 * components with comprehensive type safety and documentation.
 * @version 1.0.0
 */

// -----------------------------------------------------------------------------
// Component Exports
// -----------------------------------------------------------------------------

export { default as TaskCard } from './TaskCard';
export type { TaskCardProps } from './TaskCard';

export { default as TaskForm } from './TaskForm';
export type { TaskFormProps } from './TaskForm';

export { default as TaskList } from './TaskList';
export type { TaskListProps } from './TaskList';

export { default as TaskBoard } from './TaskBoard';
export type { TaskBoardProps } from './TaskBoard';

// -----------------------------------------------------------------------------
// Component Documentation
// -----------------------------------------------------------------------------

/**
 * Task Management Components
 * 
 * A collection of reusable task management components implementing Material Design 3
 * principles and atomic design methodology. All components:
 * 
 * 1. Follow WCAG 2.1 Level AA accessibility standards
 * 2. Support light/dark/high-contrast themes
 * 3. Implement responsive design patterns
 * 4. Include comprehensive error handling
 * 5. Support real-time updates
 * 6. Provide type safety with TypeScript
 * 
 * @example
 * import { TaskCard, TaskForm, TaskList, TaskBoard } from '@/components/task';
 * 
 * const MyComponent = () => (
 *   <div>
 *     <TaskForm onSubmit={handleSubmit} />
 *     <TaskList tasks={tasks} onTaskUpdate={handleUpdate} />
 *     <TaskBoard tasks={tasks} onTaskMove={handleMove} />
 *   </div>
 * );
 */

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskQueryParams,
  TaskStats,
  TaskTimeline
} from '../../types/task.types';

// -----------------------------------------------------------------------------
// Validation Exports
// -----------------------------------------------------------------------------

export {
  validateCreateTask,
  validateUpdateTask,
  validateTaskQuery
} from '../../validators/task.validator';

export type {
  ValidationResult
} from '../../utils/validation.utils';