/**
 * @fileoverview Central export file for all custom React hooks used in the task management application.
 * Provides a unified interface for accessing hooks across the application, ensuring consistent
 * import patterns and optimal tree-shaking capabilities.
 * @version 1.0.0
 */

// Authentication hook for user session management
export { useAuth } from './useAuth';
export type { UseAuth } from './useAuth';

// Local storage hook for persistent data management
export { default as useLocalStorage } from './useLocalStorage';

// Theme management hook for application-wide theming
export { default as useTheme } from './useTheme';

// WebSocket hook for real-time communication
export { useWebSocket } from './useWebSocket';
export type { UseWebSocket } from './useWebSocket';

// Form management hook with validation
export { useForm } from './useForm';

// Notification system hook
export { 
  useNotification,
  type UseNotificationReturn,
  NotificationType,
  NotificationPosition,
  type NotificationOptions,
  type Notification,
  type AriaLive
} from './useNotification';

/**
 * Re-export common types and interfaces used across hooks
 * This allows consumers to import these types directly from the hooks index
 */
export type {
  ValidationResult,
  FormState,
  UseFormConfig
} from './useForm';

export type {
  WebSocketMessage,
  WebSocketError,
  ConnectionState,
  MessagePriority
} from '../services/websocket.service';

export type {
  ThemeMode,
  ColorScheme
} from '../constants/theme.constants';

/**
 * @example
 * // Import hooks in components
 * import { useAuth, useTheme, useForm, useNotification } from '../hooks';
 * 
 * // Use hooks in components
 * const MyComponent = () => {
 *   const { isAuthenticated, user } = useAuth();
 *   const { themeMode, setThemeMode } = useTheme();
 *   const { showNotification } = useNotification();
 *   
 *   // Component logic...
 * };
 */