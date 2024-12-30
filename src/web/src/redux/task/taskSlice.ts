/**
 * @fileoverview Redux slice for task management with enhanced enterprise features
 * Implements normalized state management, optimistic updates, error handling, and offline support
 * @version 1.0.0
 */

import { 
  createSlice, 
  createAsyncThunk, 
  createEntityAdapter,
  createSelector,
  PayloadAction
} from '@reduxjs/toolkit'; // v2.0+
import { debounce, retry } from 'redux-saga/effects'; // v1.2+

import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  TaskError 
} from '../../types/task.types';
import { TaskApi } from '../../api/task.api';

// Initialize TaskApi instance
const taskApi = new TaskApi(apiService);

/**
 * Entity adapter for normalized task state management
 */
const taskAdapter = createEntityAdapter<Task>({
  selectId: (task) => task.id,
  sortComparer: (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
});

/**
 * Interface for the enhanced task slice state
 */
interface TaskState extends ReturnType<typeof taskAdapter.getInitialState> {
  selectedTaskId: string | null;
  loadingStates: Record<string, boolean>;
  errors: Record<string, TaskError>;
  filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    projectId?: string;
    search?: string;
    page: number;
    limit: number;
    sortBy: keyof Task;
    sortOrder: 'asc' | 'desc';
  };
  totalTasks: number;
  currentPage: number;
  pageSize: number;
  pendingRequests: string[];
  optimisticUpdates: Record<string, Task>;
  lastSync: string | null;
  offline: boolean;
}

/**
 * Initial state with enterprise-grade features
 */
const initialState: TaskState = taskAdapter.getInitialState({
  selectedTaskId: null,
  loadingStates: {},
  errors: {},
  filters: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  totalTasks: 0,
  currentPage: 1,
  pageSize: 10,
  pendingRequests: [],
  optimisticUpdates: {},
  lastSync: null,
  offline: false
});

/**
 * Enhanced async thunk for fetching tasks with caching and retry logic
 */
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params: TaskState['filters'], { rejectWithValue, getState }) => {
    try {
      const response = await retry(
        3,
        1000,
        () => taskApi.getTasks(params)
      );
      return {
        tasks: response.data.items,
        total: response.data.total
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { tasks: TaskState };
      return !state.tasks.loadingStates['fetchTasks'];
    }
  }
);

/**
 * Enhanced async thunk for creating tasks with optimistic updates
 */
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, { dispatch, rejectWithValue }) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticTask = {
      ...taskData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      dispatch(taskSlice.actions.addOptimisticUpdate({ id: tempId, task: optimisticTask }));
      const response = await taskApi.createTask(taskData);
      return response.data;
    } catch (error) {
      dispatch(taskSlice.actions.removeOptimisticUpdate(tempId));
      return rejectWithValue(error);
    }
  }
);

/**
 * Enhanced async thunk for updating tasks with offline support
 */
export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, updates }: { id: string; updates: Partial<Task> }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(taskSlice.actions.addPendingRequest(id));
      const response = await taskApi.updateTask(id, updates);
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        dispatch(taskSlice.actions.addOfflineUpdate({ id, updates }));
        return updates;
      }
      return rejectWithValue(error);
    }
  }
);

/**
 * Task management slice with comprehensive feature set
 */
const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSelectedTask: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<TaskState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1; // Reset pagination when filters change
    },
    addOptimisticUpdate: (state, action: PayloadAction<{ id: string; task: Task }>) => {
      state.optimisticUpdates[action.payload.id] = action.payload.task;
      taskAdapter.addOne(state, action.payload.task);
    },
    removeOptimisticUpdate: (state, action: PayloadAction<string>) => {
      delete state.optimisticUpdates[action.payload];
      taskAdapter.removeOne(state, action.payload);
    },
    addPendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests.push(action.payload);
    },
    removePendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests = state.pendingRequests.filter(id => id !== action.payload);
    },
    setOfflineStatus: (state, action: PayloadAction<boolean>) => {
      state.offline = action.payload;
    },
    clearErrors: (state) => {
      state.errors = {};
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks reducers
      .addCase(fetchTasks.pending, (state) => {
        state.loadingStates['fetchTasks'] = true;
        state.errors['fetchTasks'] = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loadingStates['fetchTasks'] = false;
        state.totalTasks = action.payload.total;
        state.lastSync = new Date().toISOString();
        taskAdapter.setAll(state, action.payload.tasks);
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loadingStates['fetchTasks'] = false;
        state.errors['fetchTasks'] = action.payload as TaskError;
      })
      // Create task reducers
      .addCase(createTask.fulfilled, (state, action) => {
        const tempId = Object.keys(state.optimisticUpdates)[0];
        if (tempId) {
          taskAdapter.removeOne(state, tempId);
          delete state.optimisticUpdates[tempId];
        }
        taskAdapter.addOne(state, action.payload);
      })
      // Update task reducers
      .addCase(updateTask.fulfilled, (state, action) => {
        const id = action.meta.arg.id;
        state.pendingRequests = state.pendingRequests.filter(reqId => reqId !== id);
        if (action.payload) {
          taskAdapter.updateOne(state, {
            id,
            changes: action.payload
          });
        }
      });
  }
});

// Export actions
export const {
  setSelectedTask,
  updateFilters,
  addOptimisticUpdate,
  removeOptimisticUpdate,
  setOfflineStatus,
  clearErrors
} = taskSlice.actions;

// Export selectors
export const {
  selectAll: selectAllTasks,
  selectById: selectTaskById,
  selectIds: selectTaskIds
} = taskAdapter.getSelectors((state: { tasks: TaskState }) => state.tasks);

// Custom selectors
export const selectTaskFilters = (state: { tasks: TaskState }) => state.tasks.filters;
export const selectTaskLoadingStates = (state: { tasks: TaskState }) => state.tasks.loadingStates;
export const selectTaskErrors = (state: { tasks: TaskState }) => state.tasks.errors;
export const selectIsOffline = (state: { tasks: TaskState }) => state.tasks.offline;

// Memoized selectors
export const selectFilteredTasks = createSelector(
  [selectAllTasks, selectTaskFilters],
  (tasks, filters) => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
      if (filters.projectId && task.projectId !== filters.projectId) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }
);

// Export reducer
export default taskSlice.reducer;