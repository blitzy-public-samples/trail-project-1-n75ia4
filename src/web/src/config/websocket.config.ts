/**
 * @fileoverview Production-ready WebSocket configuration for enterprise-grade real-time communication
 * @version 1.0.0
 * @license MIT
 */

/**
 * Interface defining the structure of WebSocket configuration parameters
 * for production deployment
 */
export interface WebSocketConfigInterface {
  /** Complete WebSocket URL with protocol and host */
  WS_URL: string;
  /** Interval in milliseconds between reconnection attempts */
  RECONNECT_INTERVAL: number;
  /** Maximum number of reconnection attempts */
  MAX_RETRIES: number;
  /** Interval in milliseconds between ping messages */
  PING_INTERVAL: number;
  /** Connection timeout in milliseconds */
  CONNECTION_TIMEOUT: number;
  /** Flag to enable/disable heartbeat mechanism */
  HEARTBEAT_ENABLED: boolean;
  /** WebSocket normal closure code (1000) */
  CLOSE_NORMAL: number;
  /** WebSocket abnormal closure code (1006) */
  CLOSE_ABNORMAL: number;
}

/**
 * Determines WebSocket protocol based on current connection security
 * Uses secure WebSocket (wss:) for HTTPS connections
 */
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

/**
 * WebSocket host from environment variables with fallback
 * @default 'localhost:3000'
 */
const WS_HOST = import.meta.env.VITE_WS_HOST || 'localhost:3000';

/**
 * Constructs a secure WebSocket URL based on current environment
 * @returns {string} Complete WebSocket URL with appropriate protocol and host
 * @throws {Error} If host format is invalid
 */
const getWebSocketUrl = (): string => {
  // Validate host format
  if (!WS_HOST.match(/^[\w.-]+(:\d+)?$/)) {
    throw new Error('Invalid WebSocket host format');
  }

  // Construct and return the full WebSocket URL
  return `${WS_PROTOCOL}//${WS_HOST}`;
};

/**
 * Production-ready WebSocket configuration object
 * Implements enterprise-grade settings for reliable real-time communication
 */
export const WebSocketConfig: WebSocketConfigInterface = {
  // Dynamic WebSocket URL based on environment
  WS_URL: getWebSocketUrl(),

  // Reconnection settings
  RECONNECT_INTERVAL: 5000, // 5 seconds between retry attempts
  MAX_RETRIES: 5, // Maximum 5 retry attempts

  // Connection health monitoring
  PING_INTERVAL: 30000, // 30 seconds ping interval
  CONNECTION_TIMEOUT: 10000, // 10 seconds connection timeout
  HEARTBEAT_ENABLED: true, // Enable connection heartbeat

  // WebSocket closure codes
  CLOSE_NORMAL: 1000, // Normal closure
  CLOSE_ABNORMAL: 1006 // Abnormal closure
} as const;

/**
 * Default export of the WebSocket configuration
 * Provides all necessary parameters for production deployment
 */
export default WebSocketConfig;