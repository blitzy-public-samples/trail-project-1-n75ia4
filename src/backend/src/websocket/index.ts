/**
 * @fileoverview Production-ready WebSocket module for real-time task management system
 * @version 1.0.0
 */

// External imports with versions
import { injectable, inject, Container } from 'inversify'; // v6.0.1
import { WebSocket, Server as WebSocketServer } from 'ws'; // v8.x
import CircuitBreaker from 'opossum'; // v6.x
import { RateLimiter } from 'rate-limiter-flexible'; // v2.x
import { Counter, Histogram } from 'prom-client'; // v14.x

// Internal imports
import {
  WebSocketEventType,
  WebSocketMessage,
  WebSocketHandler,
  WebSocketError
} from './types';
import { TaskWebSocketHandler } from './handlers/task.handler';
import { ProjectWebSocketHandler } from './handlers/project.handler';
import { WebSocketService } from '../services/websocket.service';

// Constants
const RATE_LIMIT_OPTIONS = {
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
};

const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
};

const CONNECTION_POOL_LIMIT = 1000;

/**
 * Enhanced WebSocket manager class with comprehensive reliability features
 */
@injectable()
export class WebSocketManager {
  private readonly wsService: WebSocketService;
  private readonly taskHandler: TaskWebSocketHandler;
  private readonly projectHandler: ProjectWebSocketHandler;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;
  private readonly metrics: {
    messageLatency: Histogram;
    errorCount: Counter;
    activeConnections: Counter;
    messageCount: Counter;
  };

  constructor(
    @inject('WebSocketService') wsService: WebSocketService,
    @inject('TaskWebSocketHandler') taskHandler: TaskWebSocketHandler,
    @inject('ProjectWebSocketHandler') projectHandler: ProjectWebSocketHandler,
    @inject('Logger') private readonly logger: any,
    @inject('MetricsClient') metricsClient: any
  ) {
    this.wsService = wsService;
    this.taskHandler = taskHandler;
    this.projectHandler = projectHandler;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.handleMessage.bind(this),
      CIRCUIT_BREAKER_OPTIONS
    );

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(RATE_LIMIT_OPTIONS);

    // Initialize metrics
    this.metrics = {
      messageLatency: new metricsClient.Histogram({
        name: 'websocket_message_duration_seconds',
        help: 'Duration of WebSocket message processing',
        labelNames: ['event_type']
      }),
      errorCount: new metricsClient.Counter({
        name: 'websocket_errors_total',
        help: 'Total number of WebSocket errors',
        labelNames: ['error_type']
      }),
      activeConnections: new metricsClient.Counter({
        name: 'websocket_active_connections',
        help: 'Number of active WebSocket connections'
      }),
      messageCount: new metricsClient.Counter({
        name: 'websocket_messages_total',
        help: 'Total number of WebSocket messages',
        labelNames: ['event_type']
      })
    };

    this.setupCircuitBreakerEvents();
  }

  /**
   * Initializes the WebSocket server with enhanced security and monitoring
   */
  public async initialize(): Promise<void> {
    try {
      await this.wsService.initialize();

      // Set up connection handling
      this.wsService.onConnection((ws: WebSocket, request: any) => {
        this.handleNewConnection(ws, request);
      });

      this.logger.info('WebSocket manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket manager:', error);
      throw error;
    }
  }

  /**
   * Handles new WebSocket connections with security checks
   */
  private async handleNewConnection(ws: WebSocket, request: any): Promise<void> {
    try {
      // Check connection pool limit
      if (this.metrics.activeConnections.get() >= CONNECTION_POOL_LIMIT) {
        ws.close(1013, 'Maximum connections reached');
        return;
      }

      // Increment connection counter
      this.metrics.activeConnections.inc();

      // Set up message handler
      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          await this.circuitBreaker.fire(ws, message);
        } catch (error) {
          this.handleError(ws, error);
        }
      });

      // Set up connection cleanup
      ws.on('close', () => {
        this.metrics.activeConnections.dec();
      });

      ws.on('error', (error) => {
        this.handleError(ws, error);
      });

    } catch (error) {
      this.handleError(ws, error);
    }
  }

  /**
   * Handles incoming WebSocket messages with rate limiting and monitoring
   */
  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const timer = this.metrics.messageLatency.startTimer({ event_type: message.type });

    try {
      // Check rate limit
      const rateLimitKey = (ws as any).clientId || 'anonymous';
      const rateLimitResult = await this.rateLimiter.consume(rateLimitKey);
      
      if (rateLimitResult.remainingPoints <= 0) {
        throw new Error('Rate limit exceeded');
      }

      // Route message to appropriate handler
      switch (message.type) {
        case WebSocketEventType.TASK_UPDATE:
          await this.taskHandler.handleMessage(ws, message);
          break;

        case WebSocketEventType.PROJECT_UPDATE:
          await this.projectHandler.handleMessage(ws, message);
          break;

        case WebSocketEventType.USER_STATUS:
          await this.wsService.broadcast(message);
          break;

        default:
          throw new Error(`Unsupported event type: ${message.type}`);
      }

      // Update metrics
      this.metrics.messageCount.inc({ event_type: message.type });
      timer();

    } catch (error) {
      timer({ success: 'false' });
      this.handleError(ws, error);
    }
  }

  /**
   * Handles and logs WebSocket errors with appropriate client responses
   */
  private handleError(ws: WebSocket, error: any): void {
    this.logger.error('WebSocket error:', error);
    this.metrics.errorCount.inc({ error_type: error.name || 'UnknownError' });

    const errorMessage: WebSocketMessage = {
      type: WebSocketEventType.ERROR,
      payload: {
        code: error.name || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date()
      },
      timestamp: new Date(),
      messageId: crypto.randomUUID()
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(errorMessage));
    }
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed');
    });
  }

  /**
   * Gracefully shuts down the WebSocket manager
   */
  public async shutdown(): Promise<void> {
    try {
      await this.wsService.shutdown();
      this.logger.info('WebSocket manager shut down successfully');
    } catch (error) {
      this.logger.error('Failed to shut down WebSocket manager:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const container = new Container();
container.bind<WebSocketManager>('WebSocketManager').to(WebSocketManager).inSingletonScope();