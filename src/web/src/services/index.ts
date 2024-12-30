/**
 * @fileoverview Centralized service exports for the Task Management System frontend.
 * Implements barrel pattern for optimized service access and dependency management.
 * @version 1.0.0
 */

// Import services in dependency order
import { StorageService } from './storage.service';
import { AuthService, authService } from './auth.service';
import { ApiService, apiService } from './api.service';
import { WebSocketService, websocketService } from './websocket.service';

// Re-export service classes for extensibility
export { StorageService } from './storage.service';
export { AuthService } from './auth.service';
export { ApiService } from './api.service';
export { WebSocketService } from './websocket.service';

// Re-export service instances for direct usage
export {
  authService,
  apiService,
  websocketService
};

// Re-export service-related types and enums
export {
  ConnectionState,
  MessagePriority,
  WebSocketMessage,
  WebSocketError
} from './websocket.service';

// Export default service bundle for convenient access
export default {
  StorageService,
  AuthService,
  ApiService,
  WebSocketService,
  // Singleton instances
  authService,
  apiService,
  websocketService
};