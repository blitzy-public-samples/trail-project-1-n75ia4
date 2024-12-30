/**
 * @fileoverview Production-ready WebSocket service for real-time communication
 * @version 1.0.0
 */

// External imports - with versions
import { WebSocket, Server as WebSocketServer } from 'ws'; // v8.x
import { injectable, inject } from 'inversify'; // v6.0.1
import Redis from 'ioredis'; // v5.x
import { EventEmitter } from 'events'; // Node.js built-in
import { rateLimit } from 'ws-rate-limit'; // v1.x
import { v4 as uuidv4 } from 'uuid'; // v9.x
import { Logger } from 'winston'; // v3.x

// Internal imports
import { WebSocketEventType, WebSocketMessage, WebSocketPayload, UserStatus } from '../websocket/types';
import { TaskStatus, TaskPriority } from '../types/task.types';
import { ProjectStatus } from '../types/project.types';
import { UserRole } from '../types/user.types';

// Constants
const REDIS_CHANNEL = 'websocket:events';
const MAX_CONNECTIONS_PER_IP = 100;
const MESSAGE_RATE_LIMIT = 100; // messages per minute
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MESSAGE_QUEUE_SIZE = 1000;
const RECONNECT_TIMEOUT = 5000;

/**
 * Interface for WebSocket client metadata
 */
interface ClientMetadata {
  userId: string;
  role: UserRole;
  rooms: Set<string>;
  lastHeartbeat: number;
  messageCount: number;
}

/**
 * Options for broadcasting messages
 */
interface BroadcastOptions {
  excludeClient?: string;
  persist?: boolean;
  priority?: 'high' | 'normal' | 'low';
  ttl?: number;
}

/**
 * Production-ready WebSocket service implementing real-time communication
 */
@injectable()
export class WebSocketService {
  private server: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private clientMetadata: Map<string, ClientMetadata> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private messageQueue: Map<string, WebSocketMessage[]> = new Map();
  private readonly eventEmitter: EventEmitter;
  
  constructor(
    @inject('RedisClient') private redisClient: Redis,
    @inject('RedisPubSub') private redisPubSub: Redis,
    @inject('Logger') private logger: Logger,
    @inject('Config') private config: any
  ) {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(0);
  }

  /**
   * Initializes the WebSocket server with security and monitoring
   */
  public async initialize(): Promise<void> {
    try {
      this.server = new WebSocketServer({
        port: this.config.websocket.port,
        perMessageDeflate: true,
        maxPayload: 1024 * 1024, // 1MB max message size
        clientTracking: true,
      });

      // Set up rate limiting
      this.server.use(rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: MESSAGE_RATE_LIMIT
      }));

      // Set up connection handling
      this.server.on('connection', this.handleConnection.bind(this));
      this.server.on('error', this.handleServerError.bind(this));

      // Set up Redis pub/sub
      await this.initializeRedisPubSub();

      // Start heartbeat monitoring
      setInterval(this.performHeartbeat.bind(this), HEARTBEAT_INTERVAL);

      this.logger.info('WebSocket server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Handles new WebSocket connections with authentication and monitoring
   */
  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    try {
      const clientId = uuidv4();
      const token = this.extractToken(request);
      const userData = await this.authenticateClient(token);

      // Set up client metadata
      this.clientMetadata.set(clientId, {
        userId: userData.id,
        role: userData.role,
        rooms: new Set(),
        lastHeartbeat: Date.now(),
        messageCount: 0
      });

      // Add to clients map
      this.clients.set(clientId, ws);

      // Set up client-specific handlers
      ws.on('message', (data: WebSocket.Data) => this.handleMessage(clientId, data));
      ws.on('close', () => this.handleDisconnection(clientId));
      ws.on('error', (error) => this.handleClientError(clientId, error));
      ws.on('pong', () => this.updateHeartbeat(clientId));

      // Send initial state
      await this.sendInitialState(clientId);

      this.logger.info(`Client connected: ${clientId}`);
    } catch (error) {
      this.logger.error('Connection handling error:', error);
      ws.close(1008, 'Connection initialization failed');
    }
  }

  /**
   * Broadcasts messages to connected clients with delivery guarantees
   */
  public async broadcast(message: WebSocketMessage, options: BroadcastOptions = {}): Promise<void> {
    try {
      const { excludeClient, persist, priority, ttl } = options;
      const messageId = uuidv4();
      const timestamp = new Date();

      const enrichedMessage = {
        ...message,
        messageId,
        timestamp,
        priority: priority || 'normal'
      };

      // Persist message if required
      if (persist) {
        await this.persistMessage(enrichedMessage, ttl);
      }

      // Publish to Redis for cluster-wide broadcast
      await this.redisPubSub.publish(REDIS_CHANNEL, JSON.stringify(enrichedMessage));

      // Local broadcast
      for (const [clientId, ws] of this.clients.entries()) {
        if (clientId === excludeClient) continue;
        if (!this.canReceiveMessage(clientId, message)) continue;

        try {
          ws.send(JSON.stringify(enrichedMessage));
          this.updateClientMessageCount(clientId);
        } catch (error) {
          this.logger.error(`Failed to send message to client ${clientId}:`, error);
          this.queueMessageForRetry(clientId, enrichedMessage);
        }
      }
    } catch (error) {
      this.logger.error('Broadcast error:', error);
      throw error;
    }
  }

  /**
   * Handles incoming messages from clients
   */
  private async handleMessage(clientId: string, data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      const metadata = this.clientMetadata.get(clientId);

      if (!metadata) {
        throw new Error('Client metadata not found');
      }

      // Validate message format and size
      this.validateMessage(message);

      // Process message based on type
      switch (message.type) {
        case WebSocketEventType.TASK_CREATED:
        case WebSocketEventType.TASK_UPDATED:
          await this.handleTaskEvent(clientId, message);
          break;
        case WebSocketEventType.PROJECT_UPDATED:
          await this.handleProjectEvent(clientId, message);
          break;
        case WebSocketEventType.USER_PRESENCE:
          await this.handlePresenceUpdate(clientId, message);
          break;
        case WebSocketEventType.CONNECTION_HEALTH:
          this.updateHeartbeat(clientId);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Message handling error for client ${clientId}:`, error);
      this.handleClientError(clientId, error);
    }
  }

  /**
   * Performs periodic heartbeat checks
   */
  private async performHeartbeat(): Promise<void> {
    const now = Date.now();
    for (const [clientId, metadata] of this.clientMetadata.entries()) {
      if (now - metadata.lastHeartbeat > HEARTBEAT_INTERVAL * 2) {
        this.logger.warn(`Client ${clientId} heartbeat timeout`);
        await this.handleDisconnection(clientId);
      } else {
        const ws = this.clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }
  }

  /**
   * Cleans up resources when a client disconnects
   */
  private async handleDisconnection(clientId: string): Promise<void> {
    try {
      const metadata = this.clientMetadata.get(clientId);
      if (metadata) {
        // Update presence status
        await this.broadcast({
          type: WebSocketEventType.USER_PRESENCE,
          payload: {
            userId: metadata.userId,
            status: 'offline' as UserStatus
          }
        });

        // Clean up client data
        this.clients.delete(clientId);
        this.clientMetadata.delete(clientId);
        
        // Remove from rooms
        metadata.rooms.forEach(room => {
          const roomClients = this.rooms.get(room);
          if (roomClients) {
            roomClients.delete(clientId);
            if (roomClients.size === 0) {
              this.rooms.delete(room);
            }
          }
        });

        this.logger.info(`Client disconnected: ${clientId}`);
      }
    } catch (error) {
      this.logger.error(`Disconnection handling error for client ${clientId}:`, error);
    }
  }

  /**
   * Initializes Redis pub/sub functionality
   */
  private async initializeRedisPubSub(): Promise<void> {
    try {
      await this.redisPubSub.subscribe(REDIS_CHANNEL);
      this.redisPubSub.on('message', async (channel, message) => {
        if (channel === REDIS_CHANNEL) {
          const parsedMessage = JSON.parse(message) as WebSocketMessage;
          await this.handleRedisMessage(parsedMessage);
        }
      });
    } catch (error) {
      this.logger.error('Redis pub/sub initialization error:', error);
      throw error;
    }
  }

  /**
   * Validates and processes messages received through Redis pub/sub
   */
  private async handleRedisMessage(message: WebSocketMessage): Promise<void> {
    try {
      this.validateMessage(message);
      await this.broadcast(message, { persist: false });
    } catch (error) {
      this.logger.error('Redis message handling error:', error);
    }
  }

  /**
   * Gracefully shuts down the WebSocket server
   */
  public async shutdown(): Promise<void> {
    try {
      // Close all client connections
      for (const [clientId, ws] of this.clients.entries()) {
        ws.close(1001, 'Server shutting down');
        await this.handleDisconnection(clientId);
      }

      // Close Redis connections
      await this.redisClient.quit();
      await this.redisPubSub.quit();

      // Close WebSocket server
      this.server.close();

      this.logger.info('WebSocket server shut down successfully');
    } catch (error) {
      this.logger.error('Shutdown error:', error);
      throw error;
    }
  }
}