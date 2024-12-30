import React, { useEffect, useCallback } from 'react'; // v18.2.0
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import classnames from 'classnames'; // v2.3.2
import { 
  NotificationType, 
  NotificationPosition,
  useNotification
} from '../../hooks/useNotification';
import styles from './Notification.module.scss';

// Animation variants for different positions
const positionVariants = {
  'top-right': {
    initial: { opacity: 0, x: 20, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 20, y: 0 }
  },
  'top-left': {
    initial: { opacity: 0, x: -20, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -20, y: 0 }
  },
  'bottom-right': {
    initial: { opacity: 0, x: 20, y: 20 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 20, y: 20 }
  },
  'bottom-left': {
    initial: { opacity: 0, x: -20, y: 20 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -20, y: 20 }
  }
};

interface NotificationProps {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  position: NotificationPosition;
  dismissible: boolean;
  ariaLabel?: string;
  role?: string;
  stackIndex: number;
}

const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.SUCCESS:
      return '✓';
    case NotificationType.ERROR:
      return '✕';
    case NotificationationType.WARNING:
      return '⚠';
    case NotificationType.INFO:
    default:
      return 'ℹ';
  }
};

const Notification: React.FC<NotificationProps> = React.memo(({
  id,
  message,
  type,
  duration,
  position,
  dismissible,
  ariaLabel,
  role = 'alert',
  stackIndex
}) => {
  const { hideNotification } = useNotification();

  // Handle auto-dismiss
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        hideNotification(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, hideNotification, id]);

  // Handle keyboard dismiss
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (dismissible && (event.key === 'Escape' || event.key === 'Enter')) {
      hideNotification(id);
    }
  }, [dismissible, hideNotification, id]);

  const notificationClasses = classnames(
    styles.notification,
    styles[`notification--${type}`],
    styles[`notification--${position}`],
    {
      [styles['notification--dismissible']]: dismissible,
      [styles['notification--accessible']]: true
    }
  );

  return (
    <motion.div
      className={notificationClasses}
      variants={positionVariants[position]}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        zIndex: 1000 - stackIndex,
        transform: `translateY(${stackIndex * 100}%)`
      }}
      role={role}
      aria-label={ariaLabel || message}
      aria-live={type === NotificationType.ERROR ? 'assertive' : 'polite'}
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles['notification__icon']}>
        {getNotificationIcon(type)}
      </div>
      <div className={styles['notification__content']}>
        <div className={styles['notification__message']}>{message}</div>
      </div>
      {dismissible && (
        <button
          className={styles['notification__close']}
          onClick={() => hideNotification(id)}
          aria-label="Close notification"
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </motion.div>
  );
});

Notification.displayName = 'Notification';

export const NotificationContainer: React.FC = () => {
  const { notifications } = useNotification();

  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (!acc[notification.position]) {
      acc[notification.position] = [];
    }
    acc[notification.position].push(notification);
    return acc;
  }, {} as Record<NotificationPosition, typeof notifications>);

  return (
    <>
      {Object.entries(groupedNotifications).map(([position, positionNotifications]) => (
        <div
          key={position}
          className={classnames(
            styles['notification-container'],
            styles[`notification-container--${position}`]
          )}
          aria-live="polite"
          role="region"
          aria-label="Notifications"
        >
          <AnimatePresence mode="sync">
            {positionNotifications.map((notification) => (
              <Notification
                key={notification.id}
                {...notification}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  );
};

export default Notification;