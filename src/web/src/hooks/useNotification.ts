import { useState, useCallback, useEffect, useRef } from 'react'; // v18.2.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Constants
const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 5;
const ANIMATION_DURATION = 300;

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum NotificationPosition {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right'
}

export type AriaLive = 'polite' | 'assertive';

// Interfaces
export interface NotificationOptions {
  message: string;
  type?: NotificationType;
  duration?: number;
  position?: NotificationPosition;
  dismissible?: boolean;
  priority?: number;
  ariaLive?: AriaLive;
}

export interface Notification extends Required<NotificationOptions> {
  id: string;
  timestamp: number;
  isAnimating: boolean;
  stackIndex: number;
}

interface NotificationTimer {
  id: string;
  timeoutId: number;
}

// Custom Hook
export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<NotificationTimer[]>([]);
  const ariaAnnouncerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup function for timers and animation frames
  const cleanup = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer.timeoutId));
    timersRef.current = [];
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Effect for cleaning up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Announce notification for screen readers
  const announceNotification = useCallback((message: string, ariaLive: AriaLive) => {
    if (ariaAnnouncerRef.current) {
      ariaAnnouncerRef.current.setAttribute('aria-live', ariaLive);
      ariaAnnouncerRef.current.textContent = message;
    }
  }, []);

  // Update notification positions
  const updateNotificationPositions = useCallback(() => {
    setNotifications(prevNotifications => {
      const positionGroups = prevNotifications.reduce((acc, notification) => {
        if (!acc[notification.position]) {
          acc[notification.position] = [];
        }
        acc[notification.position].push(notification);
        return acc;
      }, {} as Record<NotificationPosition, Notification[]>);

      const updatedNotifications = [...prevNotifications];
      Object.values(positionGroups).forEach(group => {
        group.forEach((notification, index) => {
          const notificationIndex = updatedNotifications.findIndex(n => n.id === notification.id);
          if (notificationIndex !== -1) {
            updatedNotifications[notificationIndex] = {
              ...notification,
              stackIndex: index
            };
          }
        });
      });

      return updatedNotifications;
    });
  }, []);

  // Show notification
  const showNotification = useCallback(({
    message,
    type = NotificationType.INFO,
    duration = DEFAULT_DURATION,
    position = NotificationPosition.TOP_RIGHT,
    dismissible = true,
    priority = 0,
    ariaLive = 'polite'
  }: NotificationOptions): string => {
    const id = uuidv4();
    const timestamp = Date.now();

    const newNotification: Notification = {
      id,
      message,
      type,
      duration,
      position,
      dismissible,
      priority,
      ariaLive,
      timestamp,
      isAnimating: true,
      stackIndex: 0
    };

    setNotifications(prevNotifications => {
      // Remove oldest notifications if exceeding MAX_NOTIFICATIONS
      let updatedNotifications = [...prevNotifications];
      if (updatedNotifications.length >= MAX_NOTIFICATIONS) {
        const lowestPriorityNotification = [...updatedNotifications]
          .sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp)[0];
        updatedNotifications = updatedNotifications.filter(n => n.id !== lowestPriorityNotification.id);
      }

      return [...updatedNotifications, newNotification];
    });

    // Announce notification for screen readers
    announceNotification(message, ariaLive);

    // Set up auto-dismiss timer if duration is specified
    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        hideNotification(id);
      }, duration);
      timersRef.current.push({ id, timeoutId });
    }

    // Update positions after animation
    setTimeout(() => {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isAnimating: false } : n)
      );
      updateNotificationPositions();
    }, ANIMATION_DURATION);

    return id;
  }, [announceNotification, updateNotificationPositions]);

  // Hide notification
  const hideNotification = useCallback((id: string): void => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (!notification) return prev;

      // Start exit animation
      const updatedNotifications = prev.map(n =>
        n.id === id ? { ...n, isAnimating: true } : n
      );

      // Remove notification after animation
      setTimeout(() => {
        setNotifications(current =>
          current.filter(n => n.id !== id)
        );
        updateNotificationPositions();
      }, ANIMATION_DURATION);

      return updatedNotifications;
    });

    // Clear associated timer
    const timerIndex = timersRef.current.findIndex(timer => timer.id === id);
    if (timerIndex !== -1) {
      window.clearTimeout(timersRef.current[timerIndex].timeoutId);
      timersRef.current.splice(timerIndex, 1);
    }
  }, [updateNotificationPositions]);

  // Clear all notifications
  const clearAll = useCallback((): void => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isAnimating: true }))
    );

    setTimeout(() => {
      setNotifications([]);
      cleanup();
    }, ANIMATION_DURATION);
  }, [cleanup]);

  // Create and attach ARIA live region on mount
  useEffect(() => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'notification-announcer';
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.padding = '0';
    announcer.style.margin = '-1px';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.whiteSpace = 'nowrap';
    announcer.style.border = '0';
    document.body.appendChild(announcer);
    ariaAnnouncerRef.current = announcer;

    return () => {
      document.body.removeChild(announcer);
    };
  }, []);

  return {
    notifications,
    showNotification,
    hideNotification,
    clearAll
  };
};

export type UseNotificationReturn = ReturnType<typeof useNotification>;