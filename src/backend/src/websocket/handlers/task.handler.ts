/**
 * @fileoverview Production-ready WebSocket handler for task-related events
 * @version 1.0.0
 */

// External imports with versions
import { injectable, inject } from 'inversify'; // v6.0.1
import { WebSocket } from 'ws'; // v8.x
import retry from 'retry'; // v0.13.1
import { Counter, Histogram } from 'prom-client'; // v14.x
import { Logger } from 'winston'; // v3.x

// Internal imports
import {
  WebSocketEventType,
  WebSocketMessage,
  WebSocketHandler,
  TaskUpdatePayload,
  isTaskUpdatePayload
} from '../types';
import { TaskService } from '../../services/task.service';
import { WebSocketService } from '../../services/websocket.service';
import { TYPES } from '../../config/types';

// Constants
const RETRY_OPTIONS = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000
};

const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 100
};

/**
 * Production-ready WebSocket handler for task-related events with comprehensive
 * error handling, monitoring, and security features
 */
@injectable()
export class TaskWebSocketHandler implements WebSocketHandler {
  // Metrics
  private readonly messageLatency: Histogram;
  private readonly errorCounter: Counter;
  private readonly messageCounter: Counter;

  // Rate limiting
  private readonly clientRequests: Map<string, { count: number; resetTime: number }>;

  constructor(
    @inject(TYPES.TaskService) private readonly taskService: TaskService,
    @inject(TYPES.WebSocketService) private readonly webSocketService: WebSocketService,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.MetricsClient) private readonly metrics: any
  ) {
    // Initialize metrics
    this.messageLatency = new metrics.Histogram({
      name: 'task_websocket_message_duration_seconds',
      help: 'Duration of task WebSocket message processing',
      labelNames: ['event_type']
    });

    this.errorCounter = new metrics.Counter({
      name: 'task_websocket_errors_total',
      help: 'Total number of task WebSocket errors',
      labelNames: ['error_type']
    });

    this.messageCounter = new metrics.Counter({
      name: 'task_websocket_messages_total',
      help: 'Total number of task WebSocket messages',
      labelNames: ['event_type']
    });

    this.clientRequests = new Map();
  }

  /**
   * Handles incoming WebSocket messages for task events
   * @param ws WebSocket connection
   * @param message Incoming message
   */
  public async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const timer = this.messageLatency.startTimer({ event_type: message.type });
    const clientId = (ws as any).clientId;

    try {
      // Rate limiting check
      if (!this.checkRateLimit(clientId)) {
        throw new Error('Rate limit exceeded');
      }

      // Validate message type
      if (!this.isTaskEvent(message.type)) {
        throw new Error('Invalid task event type');
      }

      // Validate payload
      if (!isTaskUpdatePayload(message.payload)) {
        throw new Error('Invalid task update payload');
      }

      // Process message based on type
      switch (message.type) {
        case WebSocketEventType.TASK_UPDATE:
          await this.handleTaskUpdate(message.payload);
          break;
        default:
          throw new Error(`Unsupported task event type: ${message.type}`);
      }

      // Update metrics
      this.messageCounter.inc({ event_type: message.type });
      timer();

    } catch (error) {
      await this.handleError(error, ws);
      timer({ success: 'false' });
    }
  }

  /**
   * Handles task update events with retry mechanism
   * @param payload Task update payload
   */
  private async handleTaskUpdate(payload: TaskUpdatePayload): Promise<void> {
    const operation = retry.operation(RETRY_OPTIONS);

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const context = {
            userId: payload.updatedBy,
            correlationId: payload.taskId,
            requestId: crypto.randomUUID(),
            includeSoftDeleted: false,
            telemetry: {
              operationStart: new Date(),
              operationName: 'websocket_task_update',
              metrics: {},
              tags: {
                attempt: currentAttempt.toString()
              }
            }
          };

          // Update task
          const result = await this.taskService.updateTask(
            payload.taskId,
            {
              title: payload.title,
              status: payload.status,
              priority: payload.priority,
              assigneeId: payload.assignees[0],
              version: 1, // Optimistic locking
              tags: payload.tags
            },
            context
          );

          if (!result.success) {
            throw new Error(result.error?.message || 'Task update failed');
          }

          // Broadcast update to all relevant clients
          await this.webSocketService.broadcast({
            type: WebSocketEventType.TASK_UPDATE,
            payload: {
              ...payload,
              updatedAt: new Date()
            }
          });

          resolve();

        } catch (error) {
          if (operation.retry(error as Error)) {
            return;
          }
          reject(operation.mainError());
        }
      });
    });
  }

  /**
   * Handles and logs errors with appropriate client responses
   * @param error Error instance
   * @param ws WebSocket connection
   */
  private async handleError(error: Error, ws: WebSocket): Promise<void> {
    this.logger.error('Task WebSocket error:', {
      error: error.message,
      stack: error.stack,
      clientId: (ws as any).clientId
    });

    this.errorCounter.inc({
      error_type: error.name || 'UnknownError'
    });

    // Send error to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: WebSocketEventType.ERROR,
        payload: {
          code: 'TASK_OPERATION_ERROR',
          message: 'Failed to process task operation',
          timestamp: new Date()
        }
      }));
    }
  }

  /**
   * Checks if the event type is task-related
   * @private
   */
  private isTaskEvent(type: WebSocketEventType): boolean {
    return type === WebSocketEventType.TASK_UPDATE;
  }

  /**
   * Implements rate limiting for clients
   * @private
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const clientData = this.clientRequests.get(clientId) || {
      count: 0,
      resetTime: now + RATE_LIMIT.windowMs
    };

    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + RATE_LIMIT.windowMs;
    }

    if (clientData.count >= RATE_LIMIT.maxRequests) {
      return false;
    }

    clientData.count++;
    this.clientRequests.set(clientId, clientData);
    return true;
  }
}