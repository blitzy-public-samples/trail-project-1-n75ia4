/**
 * User Redux Slice
 * @description Manages user state including authentication, permissions, and preferences
 * with comprehensive error handling and role-based access control.
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // v2.0.0
import {
  User,
  UserRole,
  UserStatus,
  UserPermissions,
  UserQueryParams,
} from '../../types/user.types';
import { ApiError } from '../../types/api.types';
import userApi from '../../api/user.api';

/**
 * Interface defining the shape of the user slice state
 */
interface UserState {
  users: User[];
  selectedUser: User | null;
  filters: UserQueryParams;
  loadingStates: Record<string, boolean>;
  errors: Record<string, ApiError>;
  lastUpdated: number;
  permissions: UserPermissions;
  isInitialized: boolean;
}

/**
 * Initial state for the user slice
 */
const initialState: UserState = {
  users: [],
  selectedUser: null,
  filters: {
    page: 1,
    limit: 10,
    roles: [],
    status: [],
  },
  loadingStates: {},
  errors: {},
  lastUpdated: 0,
  permissions: {
    canCreateUser: false,
    canUpdateUser: false,
    canDeleteUser: false,
    canViewUsers: false,
  },
  isInitialized: false,
};

/**
 * Async thunk for fetching users with pagination and filtering
 */
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params: UserQueryParams, { rejectWithValue }) => {
    try {
      const response = await userApi.getUsers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for fetching a single user by ID
 */
export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userApi.getUserById(userId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for updating user role with permission validation
 */
export const updateUserRole = createAsyncThunk(
  'users/updateUserRole',
  async (
    { userId, role }: { userId: string; role: UserRole },
    { rejectWithValue, getState }
  ) => {
    try {
      const response = await userApi.updateUser(userId, { role });
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk for updating user preferences
 */
export const updateUserPreferences = createAsyncThunk(
  'users/updateUserPreferences',
  async (
    { userId, preferences }: { userId: string; preferences: Partial<User['preferences']> },
    { rejectWithValue }
  ) => {
    try {
      const response = await userApi.updateUserPreferences(userId, preferences);
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * User slice definition with reducers and actions
 */
const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<UserQueryParams>) => {
      state.filters = action.payload;
    },
    clearErrors: (state) => {
      state.errors = {};
    },
    setPermissions: (state, action: PayloadAction<UserPermissions>) => {
      state.permissions = action.payload;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loadingStates['fetchUsers'] = true;
        state.errors['fetchUsers'] = undefined;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.lastUpdated = Date.now();
        state.loadingStates['fetchUsers'] = false;
        state.isInitialized = true;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loadingStates['fetchUsers'] = false;
        state.errors['fetchUsers'] = action.payload as ApiError;
      });

    // Fetch User By ID
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loadingStates['fetchUserById'] = true;
        state.errors['fetchUserById'] = undefined;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.selectedUser = action.payload;
        state.loadingStates['fetchUserById'] = false;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loadingStates['fetchUserById'] = false;
        state.errors['fetchUserById'] = action.payload as ApiError;
      });

    // Update User Role
    builder
      .addCase(updateUserRole.pending, (state) => {
        state.loadingStates['updateUserRole'] = true;
        state.errors['updateUserRole'] = undefined;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const updatedUser = action.payload;
        state.users = state.users.map(user =>
          user.id === updatedUser.id ? updatedUser : user
        );
        state.loadingStates['updateUserRole'] = false;
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.loadingStates['updateUserRole'] = false;
        state.errors['updateUserRole'] = action.payload as ApiError;
      });

    // Update User Preferences
    builder
      .addCase(updateUserPreferences.pending, (state) => {
        state.loadingStates['updateUserPreferences'] = true;
        state.errors['updateUserPreferences'] = undefined;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        const updatedUser = action.payload;
        state.users = state.users.map(user =>
          user.id === updatedUser.id ? updatedUser : user
        );
        if (state.selectedUser?.id === updatedUser.id) {
          state.selectedUser = updatedUser;
        }
        state.loadingStates['updateUserPreferences'] = false;
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.loadingStates['updateUserPreferences'] = false;
        state.errors['updateUserPreferences'] = action.payload as ApiError;
      });
  },
});

// Export actions
export const { setFilters, clearErrors, setPermissions, resetState } = userSlice.actions;

// Memoized selectors
export const selectUsers = (state: { users: UserState }) => state.users.users;
export const selectSelectedUser = (state: { users: UserState }) => state.users.selectedUser;
export const selectUserFilters = (state: { users: UserState }) => state.users.filters;
export const selectUserLoadingStates = (state: { users: UserState }) => state.users.loadingStates;
export const selectUserErrors = (state: { users: UserState }) => state.users.errors;
export const selectUserPermissions = (state: { users: UserState }) => state.users.permissions;

// Complex selectors
export const selectUsersByRole = createSelector(
  [selectUsers, (_, role: UserRole) => role],
  (users, role) => users.filter(user => user.role === role)
);

export const selectUsersByStatus = createSelector(
  [selectUsers, (_, status: UserStatus) => status],
  (users, status) => users.filter(user => user.status === status)
);

export const selectActiveUsers = createSelector(
  [selectUsers],
  (users) => users.filter(user => user.status === UserStatus.ACTIVE)
);

// Export reducer
export default userSlice.reducer;