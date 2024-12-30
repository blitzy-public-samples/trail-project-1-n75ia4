/**
 * @fileoverview Application route path constants and navigation configuration
 * @version 1.0.0
 */

/**
 * Base path for the application
 */
export const BASE_PATH = '/';

/**
 * Base API path for backend requests
 */
export const API_PATH = '/api/v1';

/**
 * Route parameter placeholders
 */
export const ROUTE_PARAMS = {
  TASK_ID: ':id',
  PROJECT_ID: ':id', 
  USER_ID: ':id',
  RESET_TOKEN: ':token'
} as const;

/**
 * Public routes accessible without authentication
 */
export enum PUBLIC_ROUTES {
  HOME = '/',
  ABOUT = '/about',
  CONTACT = '/contact'
}

/**
 * Authentication related routes for user access management
 */
export enum AUTH_ROUTES {
  LOGIN = '/auth/login',
  REGISTER = '/auth/register',
  FORGOT_PASSWORD = '/auth/forgot-password',
  RESET_PASSWORD = `/auth/reset-password/${ROUTE_PARAMS.RESET_TOKEN}`
}

/**
 * Protected routes requiring user authentication
 */
export enum PRIVATE_ROUTES {
  // Dashboard
  DASHBOARD = '/dashboard',

  // Tasks
  TASKS = '/tasks',
  TASK_CREATE = '/tasks/create',
  TASK_DETAIL = `/tasks/${ROUTE_PARAMS.TASK_ID}`,
  TASK_EDIT = `/tasks/${ROUTE_PARAMS.TASK_ID}/edit`,

  // Projects  
  PROJECTS = '/projects',
  PROJECT_CREATE = '/projects/create',
  PROJECT_DETAIL = `/projects/${ROUTE_PARAMS.PROJECT_ID}`,
  PROJECT_EDIT = `/projects/${ROUTE_PARAMS.PROJECT_ID}/edit`,

  // Team
  TEAM = '/team',
  TEAM_MEMBER = `/team/${ROUTE_PARAMS.USER_ID}`,
  TEAM_WORKLOAD = '/team/workload',

  // Reports
  REPORTS = '/reports',
  REPORT_TASK_ANALYTICS = '/reports/task-analytics',
  REPORT_PROJECT_STATUS = '/reports/project-status',

  // Settings
  SETTINGS = '/settings'
}

/**
 * Error page routes
 */
export enum ERROR_ROUTES {
  NOT_FOUND = '/404',
  SERVER_ERROR = '/500',
  FORBIDDEN = '/403',
  UNAUTHORIZED = '/401'
}

/**
 * Type guard to check if a route is public
 */
export const isPublicRoute = (route: string): boolean => {
  return Object.values(PUBLIC_ROUTES).includes(route as PUBLIC_ROUTES);
};

/**
 * Type guard to check if a route is an auth route
 */
export const isAuthRoute = (route: string): boolean => {
  return Object.values(AUTH_ROUTES).includes(route as AUTH_ROUTES);
};

/**
 * Type guard to check if a route is a private route
 */
export const isPrivateRoute = (route: string): boolean => {
  return Object.values(PRIVATE_ROUTES).includes(route as PRIVATE_ROUTES);
};

/**
 * Type guard to check if a route is an error route
 */
export const isErrorRoute = (route: string): boolean => {
  return Object.values(ERROR_ROUTES).includes(route as ERROR_ROUTES);
};

/**
 * Helper to build dynamic route paths with parameters
 */
export const buildRoute = (route: string, params: Record<string, string>): string => {
  let path = route;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });
  return path;
};