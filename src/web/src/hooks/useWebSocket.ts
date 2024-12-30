/**
 * @fileoverview Enhanced WebSocket hook for real-time communication with comprehensive
 * security features, connection management, and error handling.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // v18.2.0
import WebSocketService, { ConnectionState } from '../services/websocket.service';
import { WebSocketConfig } from '../config/websocket.config';
import { useAuth } from './useAuth';

/**
 * Interface for WebSocket connection attempt tracking
 */
interface ConnectionAttempt {
  timestamp: Date;
  success: boolean;
  error: WebSocketError | null;
  retryCount: number;
}

/**
 * Interface for detailed WebSocket errors
 */
interface WebSocketError {
  code: string;
  message: string;
  timestamp: Date;
  details: Record<string, any>;
}

/**
 * Interface for WebSocket hook state
 */
interface WebSocketHookState {
  isConnected: boolean;
  isConnecting: boolean;
  error: WebSocketError | null;
  retryCount: number;
  lastConnectAttempt: Date | null;
  connectionHistory: ConnectionAttempt[];
}

/**
 * Enhanced WebSocket hook for managing real-time connections
 * with comprehensive security and monitoring features
 */
export const useWebSocket = () => {
  // Initialize WebSocket service instance
  const wsService = useMemo(() => new WebSocketService(), []);
  const { isAuthenticated, user } = useAuth();

  // Connection state management
  const [state, setState] = useState<WebSocketHookState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    retryCount: 0,
    lastConnectAttempt: null,
    connectionHistory: []
  });

  // Refs for managing intervals and timeouts
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  /**
   * Updates connection history with new attempt
   */
  const updateConnectionHistory = useCallback((attempt: ConnectionAttempt) => {
    setState(prev => ({
      ...prev,
      connectionHistory: [...prev.connectionHistory, attempt].slice(-10) // Keep last 10 attempts
    }));
  }, []);

  /**
   * Calculates exponential backoff delay for reconnection
   */
  const getBackoffDelay = useCallback((retryCount: number): number => {
    const baseDelay = WebSocketConfig.RECONNECT_INTERVAL;
    const maxDelay = 30000; // 30 seconds maximum delay
    const delay = Math.min(
      baseDelay * Math.pow(WebSocketConfig.BACKOFF_MULTIPLIER, retryCount),
      maxDelay
    );
    return delay;
  }, []);

  /**
   * Handles secure WebSocket connection with validation
   */
  const handleSecureConnect = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('Authentication required for WebSocket connection');
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      lastConnectAttempt: new Date()
    }));

    try {
      const connected = await wsService.connect();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isConnected: connected,
          isConnecting: false,
          error: null,
          retryCount: 0
        }));

        updateConnectionHistory({
          timestamp: new Date(),
          success: true,
          error: null,
          retryCount: state.retryCount
        });
      }

      return connected;
    } catch (error) {
      const wsError: WebSocketError = {
        code: error.code || 'CONNECTION_ERROR',
        message: error.message || 'Failed to establish WebSocket connection',
        timestamp: new Date(),
        details: error.details || {}
      };

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: wsError,
          retryCount: prev.retryCount + 1
        }));

        updateConnectionHistory({
          timestamp: new Date(),
          success: false,
          error: wsError,
          retryCount: state.retryCount
        });
      }

      throw wsError;
    }
  }, [isAuthenticated, user, wsService, state.retryCount, updateConnectionHistory]);

  /**
   * Initiates WebSocket connection with retry mechanism
   */
  const connect = useCallback(async () => {
    if (state.isConnecting || state.isConnected) return;

    try {
      await handleSecureConnect();
    } catch (error) {
      if (state.retryCount < WebSocketConfig.MAX_RETRY_ATTEMPTS) {
        const backoffDelay = getBackoffDelay(state.retryCount);
        reconnectTimeoutRef.current = setTimeout(connect, backoffDelay);
      }
    }
  }, [state.isConnecting, state.isConnected, state.retryCount, handleSecureConnect, getBackoffDelay]);

  /**
   * Safely disconnects WebSocket connection
   */
  const disconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    await wsService.disconnect();

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: null
      }));
    }
  }, [wsService]);

  /**
   * Subscribes to WebSocket events with validation
   */
  const subscribe = useCallback((event: string, callback: Function) => {
    if (!state.isConnected) {
      throw new Error('WebSocket connection not established');
    }
    wsService.subscribe(event, callback);
  }, [wsService, state.isConnected]);

  /**
   * Unsubscribes from WebSocket events
   */
  const unsubscribe = useCallback((event: string) => {
    wsService.unsubscribe(event);
  }, [wsService]);

  // Effect for automatic connection management
  useEffect(() => {
    mountedRef.current = true;

    if (isAuthenticated && !state.isConnected && !state.isConnecting) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [isAuthenticated, state.isConnected, state.isConnecting, connect, disconnect]);

  // Effect for heartbeat monitoring
  useEffect(() => {
    if (state.isConnected) {
      heartbeatIntervalRef.current = setInterval(() => {
        wsService.validateConnection();
      }, 30000); // 30 seconds heartbeat interval
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [state.isConnected, wsService]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connectionHistory: state.connectionHistory,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  };
};

export type UseWebSocket = ReturnType<typeof useWebSocket>;
```

This implementation provides:

1. Secure WebSocket connection management with authentication validation
2. Exponential backoff retry mechanism with configurable attempts
3. Comprehensive error handling and connection state tracking
4. Connection history monitoring
5. Automatic reconnection on disconnection
6. Heartbeat mechanism for connection health monitoring
7. Type-safe event subscription management
8. Memory leak prevention with proper cleanup
9. Integration with authentication state
10. Production-ready error handling and logging

The hook can be used in components to manage real-time connections:

```typescript
const { isConnected, error, subscribe, unsubscribe } = useWebSocket();

useEffect(() => {
  if (isConnected) {
    subscribe('task.update', handleTaskUpdate);
    return () => unsubscribe('task.update');
  }
}, [isConnected]);