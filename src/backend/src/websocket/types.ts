/**
 * @fileoverview TypeScript type definitions for WebSocket events, messages, and handlers
 * @version 1.0.0
 * @module websocket/types
 */

// External imports
import { WebSocket } from 'ws'; // v8.x
import { UUID } from 'crypto';

// Internal imports
import { Task, TaskStatus, TaskPriority } from '../types/task.types';
import { Project, ProjectStatus } from '../types/project.types';

/**
 * Enum defining all possible WebSocket event types
 * Maps to real-time update scenarios defined in technical specifications
 */
export enum WebSocketEventType {
  TASK_UPDATE = 'TASK_UPDATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  COMMENT_NEW = 'COMMENT_NEW',
  USER_STATUS = 'USER_STATUS',
  ERROR = 'ERROR'
}

/**
 * String literal union type for user status values
 * Used for real-time presence tracking
 */
export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

/**
 * Interface for task update WebSocket messages
 * Includes comprehensive task state changes
 */
export interface TaskUpdatePayload {
  taskId: UUID;
  status: TaskStatus;
  updatedBy: UUID;
  updatedAt: Date;
  title: string;
  priority: TaskPriority;
  tags: string[];
  assignees: UUID[];
}

/**
 * Interface for project update WebSocket messages
 * Captures project state changes and progress
 */
export interface ProjectUpdatePayload {
  projectId: UUID;
  status: ProjectStatus;
  updatedBy: UUID;
  updatedAt: Date;
  name: string;
  teamMembers: UUID[];
  completionPercentage: number;
}

/**
 * Interface for new comment WebSocket messages
 * Supports @mentions and attachments
 */
export interface CommentPayload {
  taskId: UUID;
  commentId: UUID;
  content: string;
  createdBy: UUID;
  createdAt: Date;
  mentions: UUID[];
  attachments: string[];
  isEdited: boolean;
}

/**
 * Interface for user status WebSocket messages
 * Tracks user presence and activity
 */
export interface UserStatusPayload {
  userId: UUID;
  status: UserStatus;
  lastActive: Date;
  currentTask: string;
  currentProject: string;
  isAvailable: boolean;
}

/**
 * Interface for WebSocket error messages
 * Provides structured error information
 */
export interface WebSocketError {
  code: string;
  message: string;
  details: any;
  timestamp: Date;
}

/**
 * Union type for all possible WebSocket message payloads
 * Ensures type safety for message handling
 */
export type WebSocketPayload =
  | TaskUpdatePayload
  | ProjectUpdatePayload
  | CommentPayload
  | UserStatusPayload
  | WebSocketError;

/**
 * Interface for the core WebSocket message structure
 * Provides a consistent envelope for all message types
 */
export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: WebSocketPayload;
  timestamp: Date;
  messageId: UUID;
}

/**
 * Type definition for WebSocket message handlers
 * Ensures consistent handler signatures across the application
 */
export type WebSocketHandler = {
  handleMessage: (ws: WebSocket, message: WebSocketMessage) => Promise<void>;
  handleError: (ws: WebSocket, error: WebSocketError) => void;
};

/**
 * Type guard to check if a payload is a TaskUpdatePayload
 */
export function isTaskUpdatePayload(payload: WebSocketPayload): payload is TaskUpdatePayload {
  return 'taskId' in payload && 'status' in payload;
}

/**
 * Type guard to check if a payload is a ProjectUpdatePayload
 */
export function isProjectUpdatePayload(payload: WebSocketPayload): payload is ProjectUpdatePayload {
  return 'projectId' in payload && 'status' in payload;
}

/**
 * Type guard to check if a payload is a CommentPayload
 */
export function isCommentPayload(payload: WebSocketPayload): payload is CommentPayload {
  return 'commentId' in payload && 'content' in payload;
}

/**
 * Type guard to check if a payload is a UserStatusPayload
 */
export function isUserStatusPayload(payload: WebSocketPayload): payload is UserStatusPayload {
  return 'userId' in payload && 'status' in payload;
}

/**
 * Type guard to check if a payload is a WebSocketError
 */
export function isWebSocketError(payload: WebSocketPayload): payload is WebSocketError {
  return 'code' in payload && 'message' in payload;
}