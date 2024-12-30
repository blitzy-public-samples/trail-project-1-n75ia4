import React, { useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { motion, AnimatePresence } from 'framer-motion'; // v10.0.0
import classnames from 'classnames'; // v2.3.2
import {
  NotificationOptions,
  NotificationType,
  NotificationPosition
} from '../../hooks/useNotification';

// Material Design 3 tokens for toast styling
const MD3_TOKENS = {
  elevation: '0px 4px 8px rgba(0, 0, 0, 0.12)',
  borderRadius: '8px',
  spacing: '16px',
  colors: {
    [NotificationType.SUCCESS]: {
      bg: 'var(--md-sys-color-success-container)',
      fg: 'var(--md-sys-color-on-success-container)'
    },
    [NotificationType.ERROR]: {
      bg: 'var(--md-sys-color-error-container)',
      fg: 'var(--md-sys-color-on-error-container)'
    },
    [NotificationType.WARNING]: {
      bg: 'var(--md-sys-color-warning-container)',
      fg: 'var(--md-sys-color-on-warning-container)'
    },
    [NotificationType.INFO]: {
      bg: 'var(--md-sys-color-info-container)',
      fg: 'var(--md-sys-color-on-info-container)'
    }
  }
};

export interface ToastProps {
  id: string;
  message: string;
  type: NotificationType;
  position: NotificationPosition;
  dismissible: boolean;
  duration: number;
  onDismiss: (id: string) => void;
  isPaused?: boolean;
  role?: 'alert' | 'status';
  ariaLive?: 'polite' | 'assertive';
}

const getToastIcon = (type: NotificationType): JSX.Element => {
  const iconProps = {
    width: 20,
    height: 20,
    'aria-hidden': 'true',
    fill: 'currentColor'
  };

  switch (type) {
    case NotificationType.SUCCESS:
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      );
    case NotificationType.ERROR:
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
    case NotificationType.WARNING:
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
  }
};

const Toast = React.memo<ToastProps>(({
  id,
  message,
  type,
  position,
  dismissible,
  duration,
  onDismiss,
  isPaused = false,
  role = 'alert',
  ariaLive = 'polite'
}) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>();

  // Animation variants based on position
  const variants = {
    initial: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: position.includes('top') ? -20 : 20
    }
  };

  // Handle auto-dismiss timer
  useEffect(() => {
    if (duration && !isPaused && dismissible) {
      timerRef.current = window.setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [duration, id, onDismiss, isPaused, dismissible]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && dismissible) {
      onDismiss(id);
    }
  }, [id, onDismiss, dismissible]);

  // Handle click dismiss
  const handleDismiss = useCallback(() => {
    if (dismissible) {
      onDismiss(id);
    }
  }, [id, onDismiss, dismissible]);

  // Focus management
  useEffect(() => {
    if (toastRef.current) {
      toastRef.current.focus();
    }
  }, []);

  const toastClasses = classnames(
    'toast',
    `toast--${type}`,
    `toast--${position}`,
    {
      'toast--dismissible': dismissible
    }
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={toastRef}
        className={toastClasses}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        role={role}
        aria-live={ariaLive}
        aria-atomic="true"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: MD3_TOKENS.spacing,
          borderRadius: MD3_TOKENS.borderRadius,
          boxShadow: MD3_TOKENS.elevation,
          backgroundColor: MD3_TOKENS.colors[type].bg,
          color: MD3_TOKENS.colors[type].fg,
          minWidth: '280px',
          maxWidth: '560px'
        }}
      >
        <span className="toast__icon" aria-hidden="true">
          {getToastIcon(type)}
        </span>
        <span className="toast__message">{message}</span>
        {dismissible && (
          <button
            className="toast__dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

Toast.displayName = 'Toast';

export default Toast;