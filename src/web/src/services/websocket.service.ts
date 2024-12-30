/**
 * @fileoverview Enterprise-grade WebSocket service implementation for real-time communication
 * @version 1.0.0
 * @license MIT
 */

import { EventEmitter } from 'events';
import { WebSocketConfig } from '../config/websocket.config';

/**
 * Enum representing WebSocket connection states
 */
export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING'
}

/**
 * Message priority levels for queue management
 */
export enum MessagePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Interface for WebSocket message metadata
 */
interface MessageMetadata {
  userId: string;
  sessionId: string;
  clientTimestamp: number;
  correlationId: string;
  priority: MessagePriority;
}

/**
 * Interface for WebSocket messages with type safety
 */
export interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  version: string;
  retry_count: number;
  priority: MessagePriority;
  metadata: MessageMetadata;
}

/**
 * Custom WebSocket error class
 */
export class WebSocketError extends Error {
  constructor(
    public code: number,
    public reason: string,
    public timestamp: number
  ) {
    super(`WebSocket Error ${code}: ${reason}`);
    this.name = 'WebSocketError';
  }
}

/**
 * Interface for WebSocket connection metrics
 */
interface WebSocketMetrics {
  connectedAt: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectAttempts: number;
  lastPingTime: number;
  lastPongTime: number;
  averageLatency: number;
  failedMessages: number;
}

/**
 * Enterprise-grade WebSocket service implementation
 */
export class WebSocketService {
  private connection: WebSocket | null = null;
  private eventEmitter: EventEmitter;
  private reconnectAttempts: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private metrics: WebSocketMetrics;
  private subscriptions: Map<string, Function> = new Map();

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.initializeMetrics();
    this.setupEventHandlers();
  }

  /**
   * Initializes WebSocket metrics tracking
   */
  private initializeMetrics(): void {
    this.metrics = {
      connectedAt: 0,
      messagesSent: 0,
      messagesReceived: 0,
      reconnectAttempts: 0,
      lastPingTime: 0,
      lastPongTime: 0,
      averageLatency: 0,
      failedMessages: 0
    };
  }

  /**
   * Establishes WebSocket connection with retry logic
   * @param token Authentication token
   * @returns Promise resolving when connection is established
   */
  public async connect(token: string): Promise<boolean> {
    try {
      this.connectionState = ConnectionState.CONNECTING;
      this.connection = new WebSocket(WebSocketConfig.WS_URL);
      
      // Add authentication headers
      this.connection.setRequestHeader?.('Authorization', `Bearer ${token}`);

      return new Promise((resolve, reject) => {
        if (!this.connection) {
          reject(new WebSocketError(1006, 'Connection initialization failed', Date.now()));
          return;
        }

        // Connection success handler
        this.connection.onopen = () => {
          this.connectionState = ConnectionState.CONNECTED;
          this.metrics.connectedAt = Date.now();
          this.startHeartbeat();
          this.processQueuedMessages();
          resolve(true);
        };

        // Connection error handler
        this.connection.onerror = (error) => {
          const wsError = new WebSocketError(
            1006,
            'Connection error occurred',
            Date.now()
          );
          this.handleError(wsError);
          reject(wsError);
        };

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          reject(new WebSocketError(
            1006,
            'Connection timeout',
            Date.now()
          ));
        }, WebSocketConfig.CONNECTION_TIMEOUT);

        this.setupMessageHandler();
      });
    } catch (error) {
      this.handleError(error as Error);
      return this.handleReconnection();
    }
  }

  /**
   * Handles WebSocket reconnection logic
   */
  private async handleReconnection(): Promise<boolean> {
    if (this.reconnectAttempts >= WebSocketConfig.MAX_RETRIES) {
      this.connectionState = ConnectionState.DISCONNECTED;
      throw new WebSocketError(1006, 'Max reconnection attempts reached', Date.now());
    }

    this.connectionState = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;
    this.metrics.reconnectAttempts++;

    await new Promise(resolve => 
      setTimeout(resolve, WebSocketConfig.RECONNECT_INTERVAL)
    );

    return this.connect(this.getStoredToken());
  }

  /**
   * Sets up WebSocket message handler
   */
  private setupMessageHandler(): void {
    if (!this.connection) return;

    this.connection.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.metrics.messagesReceived++;
        this.eventEmitter.emit(message.type, message.payload);
      } catch (error) {
        this.handleError(error as Error);
      }
    };
  }

  /**
   * Starts heartbeat mechanism for connection health monitoring
   */
  private startHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.connection?.readyState === WebSocket.OPEN) {
        this.metrics.lastPingTime = Date.now();
        this.connection.send(JSON.stringify({ type: 'ping' }));
      }
    }, WebSocketConfig.PING_INTERVAL);
  }

  /**
   * Sends a message through WebSocket connection
   * @param message Message to be sent
   */
  public async send(message: WebSocketMessage): Promise<void> {
    if (this.connection?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      await this.connection.send(JSON.stringify(message));
      this.metrics.messagesSent++;
    } catch (error) {
      this.metrics.failedMessages++;
      this.messageQueue.push(message);
      this.handleError(error as Error);
    }
  }

  /**
   * Processes queued messages
   */
  private async processQueuedMessages(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.send(message);
      }
    }
  }

  /**
   * Subscribes to WebSocket events
   * @param event Event type to subscribe to
   * @param callback Callback function for event handling
   */
  public subscribe(event: string, callback: Function): void {
    this.subscriptions.set(event, callback);
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribes from WebSocket events
   * @param event Event type to unsubscribe from
   */
  public unsubscribe(event: string): void {
    const callback = this.subscriptions.get(event);
    if (callback) {
      this.eventEmitter.off(event, callback);
      this.subscriptions.delete(event);
    }
  }

  /**
   * Gracefully disconnects WebSocket connection
   */
  public async disconnect(): Promise<void> {
    this.connectionState = ConnectionState.DISCONNECTING;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    if (this.connection) {
      this.connection.close(WebSocketConfig.CLOSE_NORMAL);
      this.connection = null;
    }

    this.connectionState = ConnectionState.DISCONNECTED;
    this.eventEmitter.removeAllListeners();
    this.subscriptions.clear();
  }

  /**
   * Handles WebSocket errors
   * @param error Error to be handled
   */
  private handleError(error: Error): void {
    const wsError = error instanceof WebSocketError 
      ? error 
      : new WebSocketError(1006, error.message, Date.now());
    
    this.eventEmitter.emit('error', wsError);
  }

  /**
   * Gets current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Gets current WebSocket metrics
   */
  public getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Retrieves stored authentication token
   */
  private getStoredToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();