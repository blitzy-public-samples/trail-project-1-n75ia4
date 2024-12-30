/**
 * @fileoverview Centralizes and exports WebSocket event handlers with comprehensive monitoring
 * @version 1.0.0
 * @module websocket/handlers
 */

// External imports - version specified in technical requirements
import { injectable, inject } from 'inversify'; // v6.0.1
import { Counter, Histogram } from 'prom-client'; // v14.x
import { Logger } from 'winston'; // v3.x

// Internal imports
import { ProjectWebSocketHandler } from './project.handler';
import { TaskWebSocketHandler } from './task.handler';
import { WebSocketEventType, WebSocketHandler } from '../types';
import { TYPES } from '../../config/types';

/**
 * Registry for managing and routing WebSocket event handlers with comprehensive
 * error handling, performance monitoring, and type safety
 */
@injectable()
export class WebSocketHandlerRegistry {
  // Performance metrics
  private readonly handlerResolutionTime: Histogram;
  private readonly handlerErrorCount: Counter;

  // Handler mapping
  private readonly handlerMap: Map<WebSocketEventType, WebSocketHandler>;

  constructor(
    @inject(TYPES.ProjectWebSocketHandler) private readonly projectHandler: ProjectWebSocketHandler,
    @inject(TYPES.TaskWebSocketHandler) private readonly taskHandler: TaskWebSocketHandler,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.MetricsClient) private readonly metrics: any
  ) {
    // Initialize metrics
    this.handlerResolutionTime = new metrics.Histogram({
      name: 'websocket_handler_resolution_seconds',
      help: 'Time taken to resolve WebSocket event handler',
      labelNames: ['event_type']
    });

    this.handlerErrorCount = new metrics.Counter({
      name: 'websocket_handler_errors_total',
      help: 'Total number of WebSocket handler resolution errors',
      labelNames: ['event_type', 'error_type']
    });

    // Initialize handler mapping
    this.handlerMap = new Map();
    this.setupHandlerMapping();
  }

  /**
   * Sets up the mapping between event types and their handlers
   * @private
   */
  private setupHandlerMapping(): void {
    // Project-related events
    this.handlerMap.set(WebSocketEventType.PROJECT_UPDATE, this.projectHandler);

    // Task-related events
    this.handlerMap.set(WebSocketEventType.TASK_UPDATE, this.taskHandler);

    this.logger.info('WebSocket handler mapping initialized', {
      registeredHandlers: Array.from(this.handlerMap.keys())
    });
  }

  /**
   * Returns appropriate handler based on WebSocket event type with error handling
   * and performance tracking
   * @param eventType WebSocket event type
   * @returns Handler instance for the specified event type
   * @throws Error if no handler is found for the event type
   */
  public getHandler(eventType: WebSocketEventType): WebSocketHandler {
    const timer = this.handlerResolutionTime.startTimer({ event_type: eventType });

    try {
      const handler = this.handlerMap.get(eventType);
      
      if (!handler) {
        this.handlerErrorCount.inc({
          event_type: eventType,
          error_type: 'HANDLER_NOT_FOUND'
        });
        throw new Error(`No handler registered for event type: ${eventType}`);
      }

      timer({ success: 'true' });
      return handler;

    } catch (error) {
      timer({ success: 'false' });
      this.logger.error('Handler resolution error:', {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Validates if a handler exists for the given event type
   * @param eventType WebSocket event type
   * @returns boolean indicating if handler exists
   */
  public hasHandler(eventType: WebSocketEventType): boolean {
    return this.handlerMap.has(eventType);
  }

  /**
   * Returns all registered event types
   * @returns Array of registered WebSocket event types
   */
  public getRegisteredEventTypes(): WebSocketEventType[] {
    return Array.from(this.handlerMap.keys());
  }
}

// Re-export handlers and types for convenient access
export {
  ProjectWebSocketHandler,
  TaskWebSocketHandler,
  WebSocketEventType,
  WebSocketHandler
};