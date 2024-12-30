/**
 * @fileoverview TypeScript type definitions for user-related data structures, interfaces,
 * and types used throughout the frontend application. Implements comprehensive role-based
 * access control and user preferences management.
 * @version 1.0.0
 */

import { ApiResponse, PaginatedResponse, QueryParams } from '../types/api.types';

/**
 * Enumeration of user roles with strict hierarchy and corresponding access levels.
 * Aligned with the authorization matrix defined in security requirements.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  TEAM_MEMBER = 'TEAM_MEMBER',
  GUEST = 'GUEST'
}

/**
 * Enumeration of possible user account statuses with security implications.
 * Used for account lifecycle management and access control.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED'
}

/**
 * Enumeration of notification frequency preferences.
 * Controls how often users receive different types of notifications.
 */
export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

/**
 * Interface defining accessibility preferences for users.
 * Implements comprehensive accessibility options for enhanced user experience.
 */
export interface AccessibilityPreferences {
  /** High contrast mode toggle */
  highContrast: boolean;
  /** Font size scaling factor */
  fontSize: number;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Screen reader optimizations */
  screenReader: boolean;
  /** Keyboard navigation preferences */
  keyboardNavigation: boolean;
}

/**
 * Interface defining notification preferences with granular control.
 * Allows users to customize their notification experience.
 */
export interface NotificationPreferences {
  /** Email notification toggle */
  email: boolean;
  /** In-app notification toggle */
  inApp: boolean;
  /** Task update notification toggle */
  taskUpdates: boolean;
  /** Project update notification toggle */
  projectUpdates: boolean;
  /** Team update notification toggle */
  teamUpdates: boolean;
  /** Notification frequency setting */
  frequency: NotificationFrequency;
}

/**
 * Interface defining comprehensive user preferences.
 * Includes theme, language, notification, and accessibility settings.
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Interface language preference */
  language: string;
  /** Notification settings */
  notifications: NotificationPreferences;
  /** Accessibility settings */
  accessibility: AccessibilityPreferences;
}

/**
 * Core interface defining the structure of a user entity.
 * Contains all essential user properties and relationships.
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Display name */
  name: string;
  /** User role for access control */
  role: UserRole;
  /** Account status */
  status: UserStatus;
  /** User preferences */
  preferences: UserPreferences;
  /** Account creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Interface for user creation requests.
 * Defines required fields for creating new user accounts.
 */
export interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole;
  preferences?: Partial<UserPreferences>;
}

/**
 * Interface for user update requests.
 * Defines fields that can be updated for existing users.
 */
export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  preferences?: Partial<UserPreferences>;
}

/**
 * Interface for user search/filter parameters.
 * Extends common query parameters with user-specific filters.
 */
export interface UserQueryParams extends QueryParams {
  roles?: UserRole[];
  status?: UserStatus[];
  searchTerm?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Type alias for paginated user response.
 * Used for list endpoints returning multiple users.
 */
export type PaginatedUserResponse = PaginatedResponse<User>;

/**
 * Type alias for single user response.
 * Used for endpoints returning a single user.
 */
export type UserResponse = ApiResponse<User>;

/**
 * Type guard to check if a value is a valid UserRole.
 * @param value - Value to check
 */
export function isUserRole(value: any): value is UserRole {
  return Object.values(UserRole).includes(value);
}

/**
 * Type guard to check if a value is a valid UserStatus.
 * @param value - Value to check
 */
export function isUserStatus(value: any): value is UserStatus {
  return Object.values(UserStatus).includes(value);
}