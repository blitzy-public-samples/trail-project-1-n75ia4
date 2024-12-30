/**
 * @fileoverview Enterprise-grade real-time activity feed component with accessibility,
 * performance optimization, and error handling.
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtual } from 'react-virtual';
import { formatDistanceToNow } from 'date-fns';
import Card from '../common/Card';
import { websocketService, WebSocketMessage } from '../../services/websocket.service';

// Activity type definitions
export type ActivityType = 'task' | 'project' | 'comment' | 'system';
export type ActivityStatus = 'seen' | 'unseen';
export type ActivityPriority = 'normal' | 'high';

// Activity item interface
export interface ActivityItem {
  id: string;
  type: ActivityType;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  action: string;
  target: string;
  timestamp: Date;
  status: ActivityStatus;
  priority: ActivityPriority;
  metadata: Record<string, unknown>;
}

// Component props interface
export interface ActivityFeedProps {
  maxItems?: number;
  className?: string;
  filter?: ActivityFilter;
  onItemClick?: (item: ActivityItem) => void;
  autoScrollToNew?: boolean;
  showFilters?: boolean;
}

// Filter interface
export interface ActivityFilter {
  types?: ActivityType[];
  priority?: ActivityPriority;
  status?: ActivityStatus;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Custom hook for managing activity state and WebSocket updates
 */
const useActivityManager = (props: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const activitiesRef = useRef<ActivityItem[]>([]);

  // Update activities reference
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  // Handle new activity message
  const handleNewActivity = useCallback((payload: ActivityItem) => {
    setActivities(prev => {
      const newActivities = [payload, ...prev];
      return props.maxItems 
        ? newActivities.slice(0, props.maxItems) 
        : newActivities;
    });
  }, [props.maxItems]);

  // Filter activities based on provided criteria
  const filterActivities = useCallback((items: ActivityItem[]): ActivityItem[] => {
    if (!props.filter) return items;

    return items.filter(item => {
      const { types, priority, status, timeRange } = props.filter;
      
      const typeMatch = !types?.length || types.includes(item.type);
      const priorityMatch = !priority || item.priority === priority;
      const statusMatch = !status || item.status === status;
      const timeMatch = !timeRange || (
        item.timestamp >= timeRange.start && 
        item.timestamp <= timeRange.end
      );

      return typeMatch && priorityMatch && statusMatch && timeMatch;
    });
  }, [props.filter]);

  // Initialize WebSocket connection and event handlers
  useEffect(() => {
    const initializeActivities = async () => {
      try {
        setLoading(true);
        
        // Subscribe to activity updates
        websocketService.subscribe('activity.new', handleNewActivity);
        websocketService.subscribe('activity.update', (payload: WebSocketMessage) => {
          setActivities(prev => 
            prev.map(activity => 
              activity.id === payload.id 
                ? { ...activity, ...payload.payload }
                : activity
            )
          );
        });

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize activities'));
        setLoading(false);
      }
    };

    initializeActivities();

    // Cleanup subscriptions
    return () => {
      websocketService.unsubscribe('activity.new');
      websocketService.unsubscribe('activity.update');
    };
  }, [handleNewActivity]);

  return {
    activities: filterActivities(activities),
    loading,
    error,
    setActivities
  };
};

/**
 * ActivityFeed component for displaying real-time activity updates
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  maxItems = 50,
  className = '',
  filter,
  onItemClick,
  autoScrollToNew = true,
  showFilters = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activities, loading, error } = useActivityManager({ maxItems, filter });

  // Virtual list configuration for performance
  const rowVirtualizer = useVirtual({
    size: activities.length,
    parentRef: containerRef,
    estimateSize: useCallback(() => 80, []),
    overscan: 5
  });

  // Render activity item
  const renderActivityItem = (activity: ActivityItem) => (
    <Card
      variant="outlined"
      className={`activity-item ${activity.status} ${activity.priority}`}
      onClick={() => onItemClick?.(activity)}
      interactive={!!onItemClick}
      ariaLabel={`${activity.user.name} ${activity.action} ${activity.target}`}
    >
      <div className="activity-item__content">
        <div className="activity-item__header">
          <img 
            src={activity.user.avatar} 
            alt={activity.user.name}
            className="activity-item__avatar"
          />
          <span className="activity-item__user">{activity.user.name}</span>
          <span className="activity-item__time">
            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
          </span>
        </div>
        <p className="activity-item__description">
          {activity.action} {activity.target}
        </p>
      </div>
    </Card>
  );

  if (error) {
    return (
      <div className="activity-feed__error" role="alert">
        <p>Error loading activities: {error.message}</p>
        <button onClick={() => websocketService.reconnect()}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`activity-feed ${className}`}
      ref={containerRef}
      role="feed"
      aria-busy={loading}
      aria-live="polite"
    >
      {loading ? (
        <div className="activity-feed__loading" role="status">
          <span className="sr-only">Loading activities...</span>
        </div>
      ) : (
        <div
          className="activity-feed__list"
          style={{ height: `${rowVirtualizer.totalSize}px` }}
        >
          {rowVirtualizer.virtualItems.map(virtualRow => (
            <div
              key={activities[virtualRow.index].id}
              className="activity-feed__item"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {renderActivityItem(activities[virtualRow.index])}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;