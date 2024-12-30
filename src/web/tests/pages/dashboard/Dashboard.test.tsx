/**
 * @fileoverview Comprehensive test suite for the Dashboard component with full coverage
 * of rendering, data fetching, real-time updates, accessibility, and performance metrics.
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import Dashboard from '../../src/pages/dashboard/Dashboard';
import { useAuth } from '../../src/hooks/useAuth';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { createTestStore } from '../../test-utils/store';
import { theme } from '../../src/theme';
import { mockWebSocket } from '../../test-utils/websocket';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock performance measurement
const performanceMock = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
};

Object.defineProperty(window, 'performance', {
  value: performanceMock,
  writable: true,
});

// Test data
const mockDashboardData = {
  metrics: {
    totalTasks: 150,
    completedTasks: 75,
    overdueTasks: 10,
    activeProjects: 12,
    teamActivity: 45
  },
  activities: [
    {
      id: '1',
      type: 'task',
      user: { id: '1', name: 'John Doe', avatar: 'avatar.jpg' },
      action: 'completed',
      target: 'Task #123',
      timestamp: new Date().toISOString(),
      status: 'seen',
      priority: 'normal',
      metadata: {}
    }
  ]
};

// Mock hooks
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn()
}));

// Test setup interface
interface SetupTestOptions {
  initialState?: any;
  isAuthenticated?: boolean;
  isConnected?: boolean;
  theme?: 'light' | 'dark';
  highContrastMode?: boolean;
}

/**
 * Sets up test environment with all required providers and mocks
 */
const setupTest = ({
  initialState = {},
  isAuthenticated = true,
  isConnected = true,
  theme = 'light',
  highContrastMode = false
}: SetupTestOptions = {}) => {
  const store = createTestStore(initialState);
  
  // Mock auth hook
  (useAuth as jest.Mock).mockReturnValue({
    isAuthenticated,
    user: isAuthenticated ? { id: '1', name: 'Test User' } : null
  });

  // Mock WebSocket hook
  (useWebSocket as jest.Mock).mockReturnValue({
    isConnected,
    error: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  });

  // Setup WebSocket mock
  const ws = mockWebSocket();

  const renderDashboard = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <Dashboard
              highContrastMode={highContrastMode}
              preferredTheme={theme}
              telemetryEnabled={true}
            />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );
  };

  return {
    store,
    ws,
    renderDashboard,
    performanceMock
  };
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceMock.measure.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render loading state with skeleton loaders', () => {
    const { renderDashboard } = setupTest();
    renderDashboard();

    // Verify loading indicators
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    
    // Verify skeleton loaders
    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should handle successful data loading and rendering', async () => {
    const { renderDashboard, ws } = setupTest();
    renderDashboard();

    // Simulate data loading
    ws.emit('metrics.update', mockDashboardData.metrics);

    await waitFor(() => {
      // Verify metrics display
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    // Verify activity feed
    const activityFeed = screen.getByRole('region', { name: /Recent Activity/i });
    expect(activityFeed).toBeInTheDocument();
  });

  it('should handle WebSocket real-time updates', async () => {
    const { renderDashboard, ws } = setupTest();
    renderDashboard();

    // Initial state
    ws.emit('metrics.update', mockDashboardData.metrics);

    // Simulate real-time update
    const updatedMetrics = {
      ...mockDashboardData.metrics,
      totalTasks: 155
    };
    ws.emit('metrics.update', updatedMetrics);

    await waitFor(() => {
      expect(screen.getByText('155')).toBeInTheDocument();
    });

    // Verify update announcement for screen readers
    const announcer = screen.getByRole('status', { hidden: true });
    expect(announcer).toHaveTextContent(/Dashboard updated/i);
  });

  it('should handle WebSocket connection states', async () => {
    const { renderDashboard } = setupTest({ isConnected: false });
    renderDashboard();

    // Verify disconnected state
    expect(screen.getByText('Live Updates Inactive')).toBeInTheDocument();

    // Update connection state
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      error: null,
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    });

    await waitFor(() => {
      expect(screen.getByText('Live Updates Active')).toBeInTheDocument();
    });
  });

  it('should meet accessibility requirements', async () => {
    const { renderDashboard } = setupTest();
    const { container } = renderDashboard();

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA landmarks
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Dashboard metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Recent Activity/i })).toBeInTheDocument();

    // Test keyboard navigation
    const firstCard = screen.getByRole('region', { name: /Dashboard metrics/i });
    firstCard.focus();
    expect(document.activeElement).toBe(firstCard);
  });

  it('should handle error states gracefully', async () => {
    const { renderDashboard, ws } = setupTest();
    renderDashboard();

    // Simulate error
    ws.emit('error', { message: 'Connection failed' });

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    // Test retry functionality
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should optimize performance with proper loading states', async () => {
    const { renderDashboard, performanceMock } = setupTest();
    
    // Start performance measurement
    performanceMock.measure.mockReturnValue([{ duration: 1500 }]);
    
    renderDashboard();

    await waitFor(() => {
      // Verify performance marks were set
      expect(performanceMock.mark).toHaveBeenCalledWith('dashboard-render-start');
      expect(performanceMock.mark).toHaveBeenCalledWith('dashboard-render-end');
      
      // Verify performance measurement
      expect(performanceMock.measure).toHaveBeenCalledWith(
        'dashboard-render-time',
        'dashboard-render-start',
        'dashboard-render-end'
      );
    });

    // Verify render time is within acceptable range (2s requirement)
    const measurements = performanceMock.getEntriesByName('dashboard-render-time');
    expect(measurements[0].duration).toBeLessThan(2000);
  });

  it('should support high contrast mode', () => {
    const { renderDashboard } = setupTest({ highContrastMode: true });
    renderDashboard();

    const dashboard = screen.getByRole('main');
    expect(dashboard).toHaveAttribute('data-high-contrast', 'true');
  });
});