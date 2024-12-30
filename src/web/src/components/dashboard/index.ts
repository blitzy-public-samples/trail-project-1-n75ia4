/**
 * @fileoverview Barrel file that exports all dashboard-related components following atomic design principles.
 * Provides centralized access to dashboard components with comprehensive type safety and optimized module organization.
 * @version 1.0.0
 */

// Import all dashboard components with their types
import { ActivityFeed, ActivityFeedProps } from './ActivityFeed';
import { OverviewStats, OverviewStatsProps } from './OverviewStats';
import { ProjectProgress, ProjectProgressProps } from './ProjectProgress';
import { RecentTasks, RecentTasksProps } from './RecentTasks';
import { TeamActivity } from './TeamActivity';

// Export all components and their types
export {
  // Components
  ActivityFeed,
  OverviewStats,
  ProjectProgress,
  RecentTasks,
  TeamActivity,
  
  // Component Props Types
  type ActivityFeedProps,
  type OverviewStatsProps,
  type ProjectProgressProps,
  type RecentTasksProps
};

// Default export for convenient importing
export default {
  ActivityFeed,
  OverviewStats,
  ProjectProgress,
  RecentTasks,
  TeamActivity
};