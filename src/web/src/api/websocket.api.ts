/**
 * @fileoverview Production-ready WebSocket API module for enterprise-grade real-time communication
 * @version 1.0.0
 * @license MIT
 */

import { EventEmitter } from 'events'; // v3.3.0
import { WebSocketConfig } from '../config/websocket.config';
import type { ApiResponse } from '../types/api.types';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { createHmac } from 'crypto'; // Node.js built-in

/**
 * Enhanced enumeration of WebSocket event types with error states
 */
export enum WebSocketEventType {
  TASK_UPDATE = 'task.update',
  PROJECT_UPDATE = 'project.update',
  COMMENT_ADDED = 'comment.new',
  USER_STATUS = 'user.status',
  CONNECTION_ERROR = 'connection.error',
  RECONNECT_ATTEMPT = 'connection.reconnect'
}

/**
 * Interface defining WebSocket event types with enhanced security
 */
export interface WebSocketEvent {
  readonly TASK_UPDATE: typeof WebSocketEventType.TASK_UPDATE;
  readonly PROJECT_UPDATE: typeof WebSocketEventType.PROJECT_UPDATE;
  readonly COMMENT_ADDED: typeof WebSocketEventType.COMMENT_ADDED;
  readonly USER_STATUS: typeof WebSocketEventType.USER_STATUS;
  readonly ERROR: typeof WebSocketEventType.CONNECTION_ERROR;
  readonly RECONNECT: typeof WebSocketEventType.RECONNECT_ATTEMPT;
}

/**
 * Enhanced generic interface for WebSocket message payloads with validation
 */
export interface WebSocketPayload<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp: number;
  messageId: string;
  signature: string;
}

/**
 * Interface for WebSocket connection status
 */
export interface WebSocketStatus {
  connected: boolean;
  lastConnected: number | null;
  retryCount: number;
  error: Error | null;
}

/**
 * WebSocket error class with enhanced error handling
 */
class WebSocketError extends Error {
  constructor(
    message: string,
    public code: number,
    public timestamp: number = Date.now()
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

/**
 * Enterprise-grade WebSocket client with enhanced security and reliability
 */
class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = {
    connected: false,
    lastConnected: null,
    retryCount: 0,
    error: null
  };
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketPayload[] = [];

  constructor(
    private readonly url: string = WebSocketConfig.WS_URL,
    private readonly options = {
      reconnectInterval: WebSocketConfig.RECONNECT_INTERVAL,
      maxRetries: WebSocketConfig.MAX_RETRIES,
      pingInterval: WebSocketConfig.PING_INTERVAL
    }
  ) {
    super();
    this.connect();
  }

  /**
   * Establishes WebSocket connection with error handling and reconnection
   */
  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
      this.setupPingInterval();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Sets up WebSocket event listeners with enhanced error handling
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.status.connected = true;
      this.status.lastConnected = Date.now();
      this.status.retryCount = 0;
      this.status.error = null;
      this.emit(WebSocketEventType.USER_STATUS, { connected: true });
      this.processMessageQueue();
    };

    this.ws.onclose = (event) => {
      this.status.connected = false;
      this.handleClose(event);
    };

    this.ws.onerror = (error) => {
      this.handleError(error as Error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handles WebSocket connection closure with reconnection logic
   */
  private handleClose(event: CloseEvent): void {
    this.cleanup();

    if (event.code !== WebSocketConfig.CLOSE_NORMAL && this.status.retryCount < this.options.maxRetries) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    const backoffTime = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.status.retryCount),
      30000
    );

    this.reconnectTimeout = setTimeout(() => {
      this.status.retryCount++;
      this.emit(WebSocketEventType.RECONNECT_ATTEMPT, {
        attempt: this.status.retryCount,
        maxRetries: this.options.maxRetries
      });
      this.connect();
    }, backoffTime);
  }

  /**
   * Creates a secure WebSocket payload with validation and signing
   */
  private createWebSocketPayload<T>(type: WebSocketEventType, data: T): WebSocketPayload<T> {
    const messageId = uuidv4();
    const timestamp = Date.now();
    const payload = { type, data, timestamp, messageId } as Partial<WebSocketPayload<T>>;
    
    // Create HMAC signature for security
    const signature = this.signPayload(payload);
    
    return { ...payload, signature } as WebSocketPayload<T>;
  }

  /**
   * Signs payload with HMAC for security
   */
  private signPayload(payload: Partial<WebSocketPayload>): string {
    const hmac = createHmac('sha256', process.env.WS_SECRET_KEY || 'default-secret-key');
    const content = JSON.stringify({ ...payload, signature: undefined });
    return hmac.update(content).digest('hex');
  }

  /**
   * Validates incoming WebSocket message signature
   */
  private validateMessageSignature(message: WebSocketPayload): boolean {
    const { signature, ...payload } = message;
    const computedSignature = this.signPayload(payload);
    return signature === computedSignature;
  }

  /**
   * Handles incoming WebSocket messages with validation
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketPayload;
      
      if (!this.validateMessageSignature(message)) {
        throw new WebSocketError('Invalid message signature', 4000);
      }

      this.emit(message.type, message.data);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Sends WebSocket message with retry capability
   */
  public send<T>(type: WebSocketEventType, data: T): void {
    const payload = this.createWebSocketPayload(type, data);

    if (!this.status.connected) {
      this.messageQueue.push(payload);
      return;
    }

    try {
      this.ws?.send(JSON.stringify(payload));
    } catch (error) {
      this.messageQueue.push(payload);
      this.handleError(error as Error);
    }
  }

  /**
   * Processes queued messages after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const payload = this.messageQueue.shift();
      if (payload) {
        this.ws?.send(JSON.stringify(payload));
      }
    }
  }

  /**
   * Sets up ping interval for connection health monitoring
   */
  private setupPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.status.connected) {
        this.send(WebSocketEventType.USER_STATUS, { ping: Date.now() });
      }
    }, this.options.pingInterval);
  }

  /**
   * Handles WebSocket errors with enhanced error reporting
   */
  private handleError(error: Error): void {
    this.status.error = error;
    this.emit(WebSocketEventType.CONNECTION_ERROR, {
      error: error.message,
      timestamp: Date.now(),
      retryCount: this.status.retryCount
    });
  }

  /**
   * Cleans up resources and intervals
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Closes WebSocket connection and cleans up resources
   */
  public disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close(WebSocketConfig.CLOSE_NORMAL);
      this.ws = null;
    }
  }

  /**
   * Returns current WebSocket connection status
   */
  public getStatus(): WebSocketStatus {
    return { ...this.status };
  }
}

// Export singleton instance for application-wide use
export const websocketClient = new WebSocketClient();
export default websocketClient;