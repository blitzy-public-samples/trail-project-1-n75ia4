/**
 * @fileoverview User validation schemas and utilities for frontend form validation
 * Implements comprehensive validation rules for user data, preferences, and security
 * @version 1.0.0
 */

import { object, string, boolean, ref, SchemaOf } from 'yup'; // v1.3.2
import {
  UserRole,
  UserStatus,
  User,
  UserPreferences,
  NotificationFrequency
} from '../types/user.types';
import { AUTH_VALIDATION } from '../constants/validation.constants';

// Supported languages for the application
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh'] as const;

/**
 * Validation messages for user-related operations
 */
export const USER_VALIDATION_MESSAGES = {
  role: {
    required: 'User role is required',
    invalid: 'Invalid user role',
    hierarchy: 'Invalid role hierarchy change'
  },
  status: {
    required: 'User status is required',
    invalid: 'Invalid user status',
    transition: 'Invalid status transition'
  },
  preferences: {
    theme: {
      required: 'Theme preference is required',
      invalid: 'Invalid theme selection'
    },
    language: {
      required: 'Language preference is required',
      invalid: 'Invalid language selection',
      unsupported: 'Language not supported'
    },
    notifications: {
      invalid: 'Invalid notification settings',
      email: 'Invalid email notification setting',
      frequency: 'Invalid notification frequency'
    }
  },
  password: {
    strength: 'Password does not meet strength requirements',
    history: 'Password cannot be same as last 5 passwords',
    common: 'Password is too common or easily guessable',
    mismatch: 'Passwords do not match'
  }
} as const;

/**
 * Role hierarchy map for validation of role changes
 * Higher number indicates higher privilege level
 */
const ROLE_HIERARCHY = {
  [UserRole.GUEST]: 1,
  [UserRole.TEAM_MEMBER]: 2,
  [UserRole.TEAM_LEAD]: 3,
  [UserRole.PROJECT_MANAGER]: 4,
  [UserRole.ADMIN]: 5
} as const;

/**
 * Valid status transitions map
 * Defines allowed status transitions for user accounts
 */
const VALID_STATUS_TRANSITIONS = {
  [UserStatus.PENDING]: [UserStatus.ACTIVE, UserStatus.INACTIVE],
  [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.INACTIVE],
  [UserStatus.INACTIVE]: [UserStatus.ACTIVE],
  [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.INACTIVE]
} as const;

/**
 * Schema for validating user preferences
 * Implements comprehensive validation for user preference settings
 */
export const userPreferencesSchema: SchemaOf<UserPreferences> = object({
  theme: string()
    .required(USER_VALIDATION_MESSAGES.preferences.theme.required)
    .oneOf(['light', 'dark', 'system'], USER_VALIDATION_MESSAGES.preferences.theme.invalid),
  
  language: string()
    .required(USER_VALIDATION_MESSAGES.preferences.language.required)
    .oneOf(SUPPORTED_LANGUAGES, USER_VALIDATION_MESSAGES.preferences.language.unsupported),
  
  notifications: object({
    email: boolean().required(),
    inApp: boolean().required(),
    taskUpdates: boolean().required(),
    projectUpdates: boolean().required(),
    teamUpdates: boolean().required(),
    frequency: string()
      .required()
      .oneOf(Object.values(NotificationFrequency))
  }),
  
  accessibility: object({
    highContrast: boolean().required(),
    fontSize: number().min(0.8).max(1.5),
    reducedMotion: boolean().required(),
    screenReader: boolean().required(),
    keyboardNavigation: boolean().required()
  })
}).required();

/**
 * Schema for validating user profile data
 * Implements comprehensive validation for user profile information
 */
export const userProfileSchema: SchemaOf<User> = object({
  id: string().required(),
  
  email: string()
    .required(AUTH_VALIDATION.EMAIL.messages.required)
    .email(AUTH_VALIDATION.EMAIL.messages.pattern)
    .matches(AUTH_VALIDATION.EMAIL.pattern)
    .max(AUTH_VALIDATION.EMAIL.maxLength),
  
  name: string()
    .required(AUTH_VALIDATION.NAME.messages.required)
    .min(AUTH_VALIDATION.NAME.minLength)
    .max(AUTH_VALIDATION.NAME.maxLength)
    .matches(AUTH_VALIDATION.NAME.pattern),
  
  role: string()
    .required(USER_VALIDATION_MESSAGES.role.required)
    .oneOf(Object.values(UserRole), USER_VALIDATION_MESSAGES.role.invalid),
  
  status: string()
    .required(USER_VALIDATION_MESSAGES.status.required)
    .oneOf(Object.values(UserStatus), USER_VALIDATION_MESSAGES.status.invalid),
  
  preferences: userPreferencesSchema,
  
  createdAt: string().required(),
  updatedAt: string().required()
});

/**
 * Schema for validating password changes
 * Implements enhanced security validation for password updates
 */
export const userPasswordSchema = object({
  currentPassword: string()
    .required(AUTH_VALIDATION.PASSWORD.messages.required)
    .min(AUTH_VALIDATION.PASSWORD.minLength)
    .max(AUTH_VALIDATION.PASSWORD.maxLength)
    .matches(AUTH_VALIDATION.PASSWORD.pattern),
  
  newPassword: string()
    .required(AUTH_VALIDATION.PASSWORD.messages.required)
    .min(AUTH_VALIDATION.PASSWORD.minLength)
    .max(AUTH_VALIDATION.PASSWORD.maxLength)
    .matches(AUTH_VALIDATION.PASSWORD.pattern)
    .notOneOf([ref('currentPassword')], USER_VALIDATION_MESSAGES.password.history),
  
  confirmPassword: string()
    .required(AUTH_VALIDATION.PASSWORD.messages.required)
    .oneOf([ref('newPassword')], USER_VALIDATION_MESSAGES.password.mismatch)
});

/**
 * Validates role change based on role hierarchy
 * @param currentRole - Current user role
 * @param newRole - New role to validate
 * @returns boolean indicating if role change is valid
 */
export function isValidRoleChange(currentRole: UserRole, newRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[newRole];
}

/**
 * Validates status transition
 * @param currentStatus - Current user status
 * @param newStatus - New status to validate
 * @returns boolean indicating if status transition is valid
 */
export function isValidStatusTransition(currentStatus: UserStatus, newStatus: UserStatus): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Validates user profile data with role hierarchy checks
 * @param profileData - User profile data to validate
 * @param currentUserRole - Role of the user performing the validation
 * @returns Promise resolving to validation result
 */
export async function validateUserProfile(
  profileData: Partial<User>,
  currentUserRole: UserRole
): Promise<boolean> {
  try {
    await userProfileSchema.validate(profileData, { abortEarly: false });
    
    if (profileData.role && !isValidRoleChange(currentUserRole, profileData.role)) {
      throw new Error(USER_VALIDATION_MESSAGES.role.hierarchy);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Validates user preferences with enhanced security checks
 * @param preferencesData - User preferences data to validate
 * @returns Promise resolving to validation result
 */
export async function validateUserPreferences(
  preferencesData: Partial<UserPreferences>
): Promise<boolean> {
  try {
    await userPreferencesSchema.validate(preferencesData, { abortEarly: false });
    return true;
  } catch (error) {
    throw error;
  }
}