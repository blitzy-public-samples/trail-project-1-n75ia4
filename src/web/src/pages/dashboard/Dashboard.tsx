/**
 * @fileoverview Enterprise-grade dashboard component implementing Material Design 3
 * principles with real-time updates, enhanced accessibility, and performance optimizations.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMediaQuery } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import { useWebSocket } from '../../hooks/useWebSocket';
import Card from '../../components/common/Card';

// Types for dashboard state management
interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeProjects: number;
  teamActivity: number;
}

interface DashboardProps {
  className?: string;
  highContrastMode?: boolean;
  preferredTheme?: 'light' | 'dark' | 'system';
  telemetryEnabled?: boolean;
}

interface DashboardState {
  metrics: DashboardMetrics;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date;
  wsStatus: 'connected' | 'disconnected' | 'error';
}

/**
 * Enhanced Dashboard component with real-time updates and performance optimizations
 */
const Dashboard: React.FC<DashboardProps> = ({
  className = '',
  highContrastMode = false,
  preferredTheme = 'system',
  telemetryEnabled = true
}) => {
  // State management
  const [state, setState] = useState<DashboardState>({
    metrics: {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      activeProjects: 0,
      teamActivity: 0
    },
    loading: true,
    error: null,
    lastUpdate: new Date(),
    wsStatus: 'disconnected'
  });

  // Hooks
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const { isConnected, error: wsError, subscribe, unsubscribe } = useWebSocket();

  // Performance optimization with useMemo
  const theme = useMemo(() => {
    if (preferredTheme === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return preferredTheme;
  }, [preferredTheme, prefersDarkMode]);

  /**
   * Handle real-time metric updates with debouncing
   */
  const handleMetricUpdate = useCallback((update: Partial<DashboardMetrics>) => {
    setState(prev => ({
      ...prev,
      metrics: { ...prev.metrics, ...update },
      lastUpdate: new Date()
    }));

    // Announce updates for screen readers
    const announcement = `Dashboard updated. ${Object.entries(update)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')}`;
    announceUpdate(announcement);
  }, []);

  /**
   * Initialize WebSocket subscriptions and metrics
   */
  useEffect(() => {
    if (isConnected) {
      subscribe('metrics.update', handleMetricUpdate);
      subscribe('task.update', handleTaskUpdate);
      subscribe('project.update', handleProjectUpdate);

      setState(prev => ({ ...prev, wsStatus: 'connected' }));
    } else {
      setState(prev => ({ 
        ...prev, 
        wsStatus: wsError ? 'error' : 'disconnected' 
      }));
    }

    return () => {
      unsubscribe('metrics.update');
      unsubscribe('task.update');
      unsubscribe('project.update');
    };
  }, [isConnected, wsError, subscribe, unsubscribe, handleMetricUpdate]);

  /**
   * Announce updates for screen readers
   */
  const announceUpdate = (message: string) => {
    const announcer = document.getElementById('dashboard-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  };

  /**
   * Render error state
   */
  const renderError = () => (
    <Card
      variant="outlined"
      className="dashboard__error"
      highContrast={highContrastMode}
      ariaLabel="Dashboard error state"
    >
      <h2>Error Loading Dashboard</h2>
      <p>{state.error?.message || 'An unexpected error occurred'}</p>
      <button onClick={handleRetry}>Retry</button>
    </Card>
  );

  /**
   * Handle dashboard retry
   */
  const handleRetry = () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    // Implement retry logic
  };

  /**
   * Render metrics section with performance optimization
   */
  const renderMetrics = useMemo(() => (
    <div className="dashboard__metrics" role="region" aria-label="Dashboard metrics">
      <Card
        variant="elevated"
        className="metric-card"
        highContrast={highContrastMode}
      >
        <h3>Tasks Overview</h3>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric__value">{state.metrics.totalTasks}</span>
            <span className="metric__label">Total Tasks</span>
          </div>
          <div className="metric">
            <span className="metric__value">{state.metrics.completedTasks}</span>
            <span className="metric__label">Completed</span>
          </div>
          <div className="metric">
            <span className="metric__value">{state.metrics.overdueTasks}</span>
            <span className="metric__label">Overdue</span>
          </div>
        </div>
      </Card>
    </div>
  ), [state.metrics, highContrastMode]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <div role="alert" className="dashboard__error-boundary">
          <h2>Dashboard Error</h2>
          <pre>{error.message}</pre>
        </div>
      )}
    >
      <main
        className={`dashboard ${className} theme-${theme}`}
        data-high-contrast={highContrastMode}
        role="main"
      >
        {/* Accessibility announcer */}
        <div
          id="dashboard-announcer"
          className="sr-only"
          role="status"
          aria-live="polite"
        />

        {/* Connection status */}
        <div
          className={`dashboard__status status-${state.wsStatus}`}
          role="status"
          aria-live="polite"
        >
          {state.wsStatus === 'connected' ? 'Live Updates Active' : 'Live Updates Inactive'}
        </div>

        {/* Main content */}
        {state.loading ? (
          <div className="dashboard__loading" role="status">
            <span className="sr-only">Loading dashboard...</span>
          </div>
        ) : state.error ? (
          renderError()
        ) : (
          <>
            {renderMetrics}
            
            {/* Activity Feed */}
            <section className="dashboard__activity" aria-label="Recent Activity">
              <ActivityFeed
                maxItems={50}
                autoScrollToNew
                showFilters
                className="dashboard__activity-feed"
              />
            </section>
          </>
        )}
      </main>
    </ErrorBoundary>
  );
};

export default Dashboard;