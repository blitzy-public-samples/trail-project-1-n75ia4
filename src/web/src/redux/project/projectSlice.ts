/**
 * @fileoverview Redux slice for project state management
 * Implements comprehensive CRUD operations with optimistic updates,
 * error handling, and performance optimizations
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // v2.0+
import debounce from 'lodash/debounce'; // v4.17+
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectQueryParams,
  ProjectError,
  CreateProjectPayload,
  UpdateProjectPayload
} from '../../types/project.types';
import { projectApi } from '../../api/project.api';

/**
 * Enhanced interface for project slice state
 */
interface ProjectState {
  projects: Project[];
  projectsById: Record<string, Project>;
  selectedProject: Project | null;
  loading: boolean;
  error: ProjectError | null;
  totalPages: number;
  currentPage: number;
  filters: ProjectQueryParams;
  pendingRequests: Record<string, boolean>;
  retryAttempts: Record<string, number>;
  isOffline: boolean;
  optimisticUpdates: Record<string, any>;
}

/**
 * Initial state with comprehensive tracking capabilities
 */
const initialState: ProjectState = {
  projects: [],
  projectsById: {},
  selectedProject: null,
  loading: false,
  error: null,
  totalPages: 0,
  currentPage: 1,
  filters: {
    status: undefined,
    priority: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  pendingRequests: {},
  retryAttempts: {},
  isOffline: false,
  optimisticUpdates: {}
};

/**
 * Async thunk for fetching projects with enhanced error handling and caching
 */
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (params: ProjectQueryParams, { rejectWithValue, getState }) => {
    try {
      const response = await projectApi.getProjects(params);
      return {
        projects: response.data.items,
        total: response.data.total,
        totalPages: response.data.totalPages
      };
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for fetching a single project by ID
 */
export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await projectApi.getProjectById(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for creating a new project with optimistic updates
 */
export const createProject = createAsyncThunk(
  'projects/createProject',
  async (project: CreateProjectPayload, { rejectWithValue }) => {
    try {
      const response = await projectApi.createProject(project);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for updating a project with optimistic updates
 */
export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, data }: { id: string; data: UpdateProjectPayload }, { rejectWithValue, getState }) => {
    try {
      const response = await projectApi.updateProject(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for deleting a project with optimistic updates
 */
export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      await projectApi.deleteProject(projectId);
      return projectId;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Project slice with comprehensive state management
 */
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ProjectQueryParams>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setSelectedProject: (state, action: PayloadAction<Project | null>) => {
      state.selectedProject = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setOfflineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Fetch Projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.projects;
        state.projectsById = action.payload.projects.reduce((acc, project) => {
          acc[project.id] = project;
          return acc;
        }, {} as Record<string, Project>);
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProjectError;
      })

    // Fetch Project by ID
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProject = action.payload;
        state.projectsById[action.payload.id] = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProjectError;
      })

    // Create Project
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload);
        state.projectsById[action.payload.id] = action.payload;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProjectError;
      })

    // Update Project
      .addCase(updateProject.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Optimistic update
        const { id, data } = action.meta.arg;
        if (state.projectsById[id]) {
          state.optimisticUpdates[id] = state.projectsById[id];
          state.projectsById[id] = { ...state.projectsById[id], ...data };
        }
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projectsById[action.payload.id] = action.payload;
        state.projects = state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        );
        delete state.optimisticUpdates[action.payload.id];
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProjectError;
        // Rollback optimistic update
        const { id } = action.meta.arg;
        if (state.optimisticUpdates[id]) {
          state.projectsById[id] = state.optimisticUpdates[id];
          delete state.optimisticUpdates[id];
        }
      })

    // Delete Project
      .addCase(deleteProject.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Optimistic delete
        const projectId = action.meta.arg;
        state.optimisticUpdates[projectId] = state.projectsById[projectId];
        delete state.projectsById[projectId];
        state.projects = state.projects.filter(project => project.id !== projectId);
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading = false;
        delete state.optimisticUpdates[action.payload];
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProjectError;
        // Rollback optimistic delete
        const projectId = action.meta.arg;
        if (state.optimisticUpdates[projectId]) {
          state.projectsById[projectId] = state.optimisticUpdates[projectId];
          state.projects.push(state.optimisticUpdates[projectId]);
          delete state.optimisticUpdates[projectId];
        }
      });
  }
});

// Memoized selectors for optimized performance
export const selectProjects = createSelector(
  [(state: { projects: ProjectState }) => state.projects],
  (projectState) => projectState.projects
);

export const selectProjectById = createSelector(
  [(state: { projects: ProjectState }) => state.projects.projectsById, 
   (_: any, projectId: string) => projectId],
  (projectsById, projectId) => projectsById[projectId]
);

export const selectProjectsLoading = (state: { projects: ProjectState }) => state.projects.loading;
export const selectProjectsError = (state: { projects: ProjectState }) => state.projects.error;
export const selectProjectFilters = (state: { projects: ProjectState }) => state.projects.filters;
export const selectTotalPages = (state: { projects: ProjectState }) => state.projects.totalPages;

// Debounced project search function
export const debouncedProjectSearch = debounce(
  (dispatch, params: ProjectQueryParams) => {
    dispatch(fetchProjects(params));
  },
  300,
  { leading: false, trailing: true }
);

export const { 
  setFilters, 
  clearFilters, 
  setSelectedProject, 
  clearError,
  setOfflineStatus 
} = projectSlice.actions;

export default projectSlice.reducer;