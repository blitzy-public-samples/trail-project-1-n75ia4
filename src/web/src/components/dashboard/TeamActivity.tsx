/**
 * @fileoverview A dashboard component that displays real-time team member activities
 * with enhanced accessibility, performance optimizations, and high contrast support
 * in a virtualized card-based layout.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as VirtualList } from 'react-window'; // v1.8.9
import { formatDistanceToNow } from 'date-fns'; // v2.30.0
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import { User } from '../../types/user.types';
import styles from './TeamActivity.module.css';

/**
 * Interface for individual activity items with comprehensive metadata
 */
interface ActivityItem {
  id: string;
  user: User;
  action: string;
  timestamp: Date;
  type: 'task' | 'project' | 'comment' | 'other';
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Props interface for the TeamActivity component with enhanced configuration options
 */
interface TeamActivityProps {
  /** Array of team activities to display */
  activities: ActivityItem[];
  /** Optional CSS class name for styling */
  className?: string;
  /** Maximum number of activities to show */
  maxItems?: number;
  /** Interval for polling updates in milliseconds */
  refreshInterval?: number;
  /** Handler for activity item click events */
  onActivityClick?: (activity: ActivityItem) => void;
}

/**
 * Formats the activity timestamp into a localized relative time string
 */
const formatActivityTime = (timestamp: Date): string => {
  try {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Unknown time';
  }
};

/**
 * Renders an individual activity item with accessibility support
 */
const ActivityItemRenderer = React.memo(({ 
  activity,
  onClick,
  style
}: { 
  activity: ActivityItem;
  onClick?: (activity: ActivityItem) => void;
  style: React.CSSProperties;
}) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(activity);
    }
  };

  return (
    <div
      style={style}
      className={styles.activityItem}
      onClick={() => onClick?.(activity)}
      onKeyPress={handleKeyPress}
      role="listitem"
      tabIndex={0}
      aria-label={`${activity.user.name} ${activity.action}`}
    >
      <Avatar
        user={activity.user}
        size="small"
        alt={`${activity.user.name}'s avatar`}
      />
      <div className={styles.activityContent}>
        <span className={styles.activityUser}>{activity.user.name}</span>
        <span className={styles.activityAction}>{activity.action}</span>
        {activity.priority && (
          <span 
            className={`${styles.activityPriority} ${styles[`priority-${activity.priority}`]}`}
            aria-label={`Priority: ${activity.priority}`}
          >
            {activity.priority}
          </span>
        )}
      </div>
      <time 
        className={styles.activityTime}
        dateTime={activity.timestamp.toISOString()}
        aria-label={`Activity time: ${formatActivityTime(activity.timestamp)}`}
      >
        {formatActivityTime(activity.timestamp)}
      </time>
    </div>
  );
});

ActivityItemRenderer.displayName = 'ActivityItemRenderer';

/**
 * TeamActivity component that displays real-time team member activities
 * with enhanced accessibility and performance optimizations
 */
const TeamActivity: React.FC<TeamActivityProps> = ({
  activities,
  className,
  maxItems = 5,
  refreshInterval = 30000,
  onActivityClick,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize filtered and sorted activities
  const sortedActivities = useMemo(() => {
    return activities
      .slice(0, maxItems)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, maxItems]);

  // Handle activity refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      setIsLoading(true);
      // Simulate refresh - replace with actual API call
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Virtual list row renderer
  const rowRenderer = useCallback(({ index, style }) => {
    const activity = sortedActivities[index];
    return (
      <ActivityItemRenderer
        activity={activity}
        onClick={onActivityClick}
        style={style}
      />
    );
  }, [sortedActivities, onActivityClick]);

  return (
    <Card
      className={`${styles.teamActivity} ${className || ''}`}
      variant="outlined"
      aria-label="Team activity feed"
      testId="team-activity-feed"
    >
      <h2 className={styles.title}>Team Activity</h2>
      
      {/* Loading and error states */}
      {isLoading && (
        <div className={styles.loadingState} aria-live="polite">
          Updating activity feed...
        </div>
      )}
      {error && (
        <div className={styles.errorState} role="alert">
          {error}
        </div>
      )}

      {/* Virtualized activity list */}
      <div 
        className={styles.activityList}
        role="list"
        aria-label="Recent team activities"
      >
        <VirtualList
          height={400}
          width="100%"
          itemCount={sortedActivities.length}
          itemSize={72}
          overscanCount={2}
        >
          {rowRenderer}
        </VirtualList>
      </div>

      {/* Empty state */}
      {sortedActivities.length === 0 && (
        <div className={styles.emptyState} role="status">
          No recent team activities
        </div>
      )}
    </Card>
  );
};

export default React.memo(TeamActivity);

// CSS Module styles
const cssModule = `
.teamActivity {
  height: 100%;
  min-height: 200px;
  max-height: 600px;
  overflow: hidden;
}

.title {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0 0 1rem;
  color: var(--text-primary);
}

.activityList {
  position: relative;
  height: calc(100% - 3rem);
}

.activityItem {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.activityItem:hover {
  background-color: var(--surface-hover);
}

.activityItem:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.activityContent {
  flex: 1;
  min-width: 0;
}

.activityUser {
  font-weight: 500;
  color: var(--text-primary);
}

.activityAction {
  margin-left: 0.5rem;
  color: var(--text-secondary);
}

.activityTime {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.activityPriority {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

.priority-high {
  background-color: var(--error-light);
  color: var(--error);
}

.priority-medium {
  background-color: var(--warning-light);
  color: var(--warning);
}

.priority-low {
  background-color: var(--success-light);
  color: var(--success);
}

.loadingState,
.errorState,
.emptyState {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
}

.errorState {
  color: var(--error);
}

@media (prefers-reduced-motion: reduce) {
  .activityItem {
    transition: none;
  }
}

@media (forced-colors: active) {
  .activityItem {
    border-bottom: 1px solid CanvasText;
  }
  
  .activityItem:focus {
    outline: 2px solid ButtonText;
  }
}
`;