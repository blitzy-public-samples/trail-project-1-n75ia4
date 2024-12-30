import React, { useEffect, useMemo, useCallback, useState } from 'react';
import classNames from 'classnames';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { TaskStatus, TaskPriority, Task } from '../../types/task.types';

// Constants for real-time updates and date calculations
const DEFAULT_UPDATE_INTERVAL = 30000; // 30 seconds
const DUE_SOON_THRESHOLD = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

interface OverviewStatsProps {
  /** Array of tasks to analyze for statistics */
  tasks: Task[];
  /** Optional CSS class name for styling */
  className?: string;
  /** Interval in milliseconds for real-time updates */
  updateInterval?: number;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  dueSoonTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  averageCompletionTime: number;
  statusDistribution: Record<TaskStatus, number>;
}

/**
 * OverviewStats Component
 * 
 * Displays comprehensive task statistics and metrics with real-time updates
 * and enhanced accessibility features.
 * 
 * @version 1.0.0
 */
const OverviewStats: React.FC<OverviewStatsProps> = React.memo(({
  tasks,
  className,
  updateInterval = DEFAULT_UPDATE_INTERVAL
}) => {
  const [stats, setStats] = useState<TaskStats>({
    totalTasks: 0,
    completedTasks: 0,
    dueSoonTasks: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
    averageCompletionTime: 0,
    statusDistribution: {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.REVIEW]: 0,
      [TaskStatus.DONE]: 0
    }
  });

  /**
   * Calculates comprehensive task statistics
   */
  const calculateTaskStats = useCallback((tasks: Task[]): TaskStats => {
    const now = new Date();
    const stats: TaskStats = {
      totalTasks: tasks.length,
      completedTasks: 0,
      dueSoonTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      averageCompletionTime: 0,
      statusDistribution: {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.REVIEW]: 0,
        [TaskStatus.DONE]: 0
      }
    };

    let totalCompletionTime = 0;
    let completedTaskCount = 0;

    tasks.forEach(task => {
      // Update status distribution
      stats.statusDistribution[task.status]++;

      // Count completed tasks
      if (task.status === TaskStatus.DONE) {
        stats.completedTasks++;
        const completionTime = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
        totalCompletionTime += completionTime;
        completedTaskCount++;
      }

      // Count high priority tasks
      if (task.priority === TaskPriority.HIGH) {
        stats.highPriorityTasks++;
      }

      // Check due soon and overdue tasks
      const dueDate = new Date(task.dueDate).getTime();
      const timeUntilDue = dueDate - now.getTime();

      if (task.status !== TaskStatus.DONE) {
        if (timeUntilDue < 0) {
          stats.overdueTasks++;
        } else if (timeUntilDue <= DUE_SOON_THRESHOLD) {
          stats.dueSoonTasks++;
        }
      }
    });

    // Calculate average completion time in days
    stats.averageCompletionTime = completedTaskCount > 0
      ? totalCompletionTime / completedTaskCount / (24 * 60 * 60 * 1000)
      : 0;

    return stats;
  }, []);

  /**
   * Calculate completion percentage
   */
  const completionPercentage = useMemo(() => {
    if (stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  }, [stats.completedTasks, stats.totalTasks]);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(calculateTaskStats(tasks));
    };

    // Initial calculation
    updateStats();

    // Set up periodic updates
    const intervalId = setInterval(updateStats, updateInterval);

    return () => clearInterval(intervalId);
  }, [tasks, updateInterval, calculateTaskStats]);

  return (
    <div 
      className={classNames('overview-stats', className)}
      role="region"
      aria-label="Task Overview Statistics"
    >
      {/* Overall Progress Card */}
      <Card
        variant="elevated"
        className="overview-stats__card"
        ariaLabel="Overall Progress"
      >
        <h2 className="overview-stats__title">Overall Progress</h2>
        <ProgressBar
          value={completionPercentage}
          variant="primary"
          size="large"
          label={`${completionPercentage}% Complete`}
          animated
        />
        <div className="overview-stats__metrics">
          <span className="overview-stats__metric">
            {stats.completedTasks} of {stats.totalTasks} tasks completed
          </span>
        </div>
      </Card>

      {/* Task Status Distribution */}
      <Card
        variant="elevated"
        className="overview-stats__card"
        ariaLabel="Task Distribution"
      >
        <h2 className="overview-stats__title">Task Distribution</h2>
        <div className="overview-stats__distribution">
          {Object.entries(stats.statusDistribution).map(([status, count]) => (
            <div key={status} className="overview-stats__distribution-item">
              <span className="overview-stats__label">{status}</span>
              <ProgressBar
                value={(count / stats.totalTasks) * 100}
                variant={status === TaskStatus.DONE ? 'success' : 'primary'}
                size="medium"
                label={`${count} tasks`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Priority Metrics */}
      <Card
        variant="elevated"
        className="overview-stats__card"
        ariaLabel="Task Priorities"
      >
        <h2 className="overview-stats__title">Priority Metrics</h2>
        <div className="overview-stats__metrics">
          <div className="overview-stats__metric">
            <span className="overview-stats__label">High Priority</span>
            <span className="overview-stats__value">{stats.highPriorityTasks}</span>
          </div>
          <div className="overview-stats__metric">
            <span className="overview-stats__label">Due Soon</span>
            <span className="overview-stats__value">{stats.dueSoonTasks}</span>
          </div>
          <div className="overview-stats__metric">
            <span className="overview-stats__label">Overdue</span>
            <span className="overview-stats__value overview-stats__value--warning">
              {stats.overdueTasks}
            </span>
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card
        variant="elevated"
        className="overview-stats__card"
        ariaLabel="Performance Metrics"
      >
        <h2 className="overview-stats__title">Performance</h2>
        <div className="overview-stats__metrics">
          <div className="overview-stats__metric">
            <span className="overview-stats__label">Avg. Completion Time</span>
            <span className="overview-stats__value">
              {stats.averageCompletionTime.toFixed(1)} days
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
});

OverviewStats.displayName = 'OverviewStats';

export default OverviewStats;