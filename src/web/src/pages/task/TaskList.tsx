/**
 * @fileoverview Enhanced task list page component with virtualization, accessibility,
 * and comprehensive filtering capabilities. Implements Material Design 3 principles.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material'; // v5.14.0
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material'; // v5.14.0

import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  TaskQueryParams 
} from '../../types/task.types';
import { useTaskQuery } from '../../hooks/useTaskQuery';
import { useDebounce } from '../../hooks/useDebounce';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { TaskCard } from '../../components/task/TaskCard';
import { TaskListSkeleton } from '../../components/task/TaskListSkeleton';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { withSuspense } from '../../hoc/withSuspense';

// Constants for virtualization and filtering
const ITEM_SIZE = 60;
const OVERSCAN_COUNT = 5;
const DEBOUNCE_DELAY = 300;
const DEFAULT_PAGE_SIZE = 20;

interface TaskViewState {
  view: 'list' | 'grid';
  sortBy: keyof Task;
  sortOrder: 'asc' | 'desc';
}

/**
 * Enhanced task list page component with virtualization and accessibility features.
 * Implements comprehensive filtering, sorting, and view options.
 */
const TaskListPage: React.FC = () => {
  // Refs for virtualization and accessibility
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Local state management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [viewState, setViewState] = useLocalStorage<TaskViewState>('taskViewState', {
    view: 'list',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Filter state management
  const [filters, setFilters] = useState<TaskQueryParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    status: undefined,
    priority: undefined,
    sortBy: viewState.sortBy,
    sortOrder: viewState.sortOrder,
    search: ''
  });

  // Debounced search handler
  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_DELAY);

  // Task query hook with pagination and filtering
  const { 
    data: taskData, 
    isLoading, 
    isError, 
    error,
    isFetching,
    refetch 
  } = useTaskQuery(filters);

  // Virtualization setup
  const virtualizer = useVirtualizer({
    count: taskData?.total || 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_SIZE,
    overscan: OVERSCAN_COUNT
  });

  // Memoized active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== undefined).length - 2; // Exclude page and limit
  }, [filters]);

  /**
   * Handles search input changes with debouncing
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  /**
   * Updates filters when search term changes
   */
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearch,
      page: 1 // Reset to first page on search
    }));
  }, [debouncedSearch]);

  /**
   * Handles filter changes with type safety
   */
  const handleFilterChange = useCallback(<K extends keyof TaskQueryParams>(
    key: K,
    value: TaskQueryParams[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page on filter change
    }));
  }, []);

  /**
   * Handles view mode toggle between list and grid
   */
  const handleViewChange = useCallback((newView: 'list' | 'grid') => {
    setViewState(prev => ({
      ...prev,
      view: newView
    }));
  }, [setViewState]);

  /**
   * Resets all filters to default values
   */
  const handleResetFilters = useCallback(() => {
    setFilters({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchTerm('');
  }, []);

  /**
   * Renders the filter toolbar with all filter controls
   */
  const renderFilterToolbar = () => (
    <Toolbar
      sx={{ 
        gap: 2, 
        flexWrap: 'wrap',
        minHeight: { xs: 'auto', sm: 64 },
        py: 1
      }}
    >
      <TextField
        size="small"
        placeholder="Search tasks..."
        value={searchTerm}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: <SearchIcon color="action" />,
          endAdornment: searchTerm && (
            <IconButton size="small" onClick={() => setSearchTerm('')}>
              <ClearIcon />
            </IconButton>
          )
        }}
        sx={{ flexGrow: { xs: 1, sm: 0 }, minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value as TaskStatus)}
          label="Status"
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(TaskStatus).map(status => (
            <MenuItem key={status} value={status}>
              {status.replace('_', ' ')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Priority</InputLabel>
        <Select
          value={filters.priority || ''}
          onChange={e => handleFilterChange('priority', e.target.value as TaskPriority)}
          label="Priority"
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(TaskPriority).map(priority => (
            <MenuItem key={priority} value={priority}>
              {priority}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title="Toggle view">
        <IconButton
          onClick={() => handleViewChange(viewState.view === 'list' ? 'grid' : 'list')}
          color="inherit"
        >
          {viewState.view === 'list' ? <ViewModuleIcon /> : <ViewListIcon />}
        </IconButton>
      </Tooltip>

      {activeFiltersCount > 0 && (
        <Tooltip title="Reset filters">
          <Chip
            label={`${activeFiltersCount} active filters`}
            onDelete={handleResetFilters}
            size="small"
          />
        </Tooltip>
      )}
    </Toolbar>
  );

  /**
   * Renders the main task list content with virtualization
   */
  const renderTaskList = () => {
    if (isError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error?.message || 'Error loading tasks'}
        </Alert>
      );
    }

    if (!taskData?.items.length && !isLoading) {
      return (
        <Alert severity="info" sx={{ m: 2 }}>
          No tasks found
        </Alert>
      );
    }

    return (
      <Box
        ref={scrollRef}
        sx={{
          height: '100%',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <Box
          sx={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => (
            <Box
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <TaskCard
                task={taskData.items[virtualRow.index]}
                selected={selectedTask === taskData.items[virtualRow.index].id}
                onSelect={setSelectedTask}
                view={viewState.view}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Paper
      ref={containerRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {renderFilterToolbar()}
      
      {isFetching && !isLoading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      )}

      {isLoading ? <TaskListSkeleton /> : renderTaskList()}
    </Paper>
  );
};

// Export with error boundary and suspense wrapper
export default withSuspense(
  ErrorBoundary.wrap(TaskListPage),
  <TaskListSkeleton />
);