/**
 * @fileoverview TypeScript type definitions for user-related data structures
 * @version 1.0.0
 * @module types/user
 */

// External imports
import { UUID } from 'crypto'; // v20.0.0+

/**
 * Enum defining user roles for role-based access control (RBAC)
 * Maps to authorization matrix defined in technical specifications
 */
export enum UserRole {
  ADMIN = 'ADMIN',                     // Full system access
  PROJECT_MANAGER = 'PROJECT_MANAGER', // Project-level management access
  TEAM_LEAD = 'TEAM_LEAD',            // Team-level management access
  TEAM_MEMBER = 'TEAM_MEMBER',        // Standard team member access
  GUEST = 'GUEST'                     // Limited read-only access
}

/**
 * Enum defining possible user account statuses
 * Used for account lifecycle management
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',         // Fully active account
  INACTIVE = 'INACTIVE',     // Deactivated account
  PENDING = 'PENDING',       // Awaiting activation/verification
  SUSPENDED = 'SUSPENDED'    // Temporarily disabled account
}

/**
 * Interface defining notification preferences for different channels and types
 */
export interface NotificationPreferences {
  email: boolean;           // Email notification toggle
  inApp: boolean;          // In-application notification toggle
  taskUpdates: boolean;    // Task-related updates toggle
  projectUpdates: boolean; // Project-related updates toggle
}

/**
 * Interface defining user customization preferences
 */
export interface UserPreferences {
  theme: string;                           // UI theme preference
  language: string;                        // Interface language preference
  notifications: NotificationPreferences;  // Notification settings
}

/**
 * Core interface defining the complete structure of a user entity
 */
export interface User {
  id: UUID;                    // Unique identifier
  email: string;               // User email address (unique)
  name: string;                // Full name
  role: UserRole;              // User role for RBAC
  status: UserStatus;          // Account status
  preferences: UserPreferences; // User preferences
  createdAt: Date;             // Account creation timestamp
  updatedAt: Date;             // Last update timestamp
}

/**
 * Data transfer object for user creation operations
 * Omits system-generated fields like id and timestamps
 */
export interface CreateUserDTO {
  email: string;               // Required email address
  name: string;                // Required full name
  role: UserRole;              // Required initial role
  preferences?: UserPreferences; // Optional initial preferences
}

/**
 * Data transfer object for user update operations
 * All fields are optional to support partial updates
 */
export interface UpdateUserDTO {
  name?: string;               // Optional name update
  role?: UserRole;             // Optional role update
  status?: UserStatus;         // Optional status update
  preferences?: UserPreferences; // Optional preferences update
}

/**
 * Interface for advanced user query parameters
 * Supports filtering, pagination, and sorting
 */
export interface UserQueryParams {
  role?: UserRole;              // Filter by role
  status?: UserStatus;          // Filter by status
  search?: string;              // Search in name/email
  page?: number;                // Pagination page number
  limit?: number;               // Items per page
  sortBy?: string;              // Sort field
  sortOrder?: 'asc' | 'desc';   // Sort direction
}