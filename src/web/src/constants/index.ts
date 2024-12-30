/**
 * @fileoverview Central barrel file for application constants
 * @version 1.0.0
 * 
 * This file aggregates and re-exports all application constants with strict type safety
 * and immutability. It serves as the single source of truth for application-wide constants
 * including API configurations, route paths, theme settings, and validation rules.
 */

// API Constants
export {
  API_VERSION,
  API_ENDPOINTS,
  API_RATE_LIMITS,
  HTTP_METHODS,
  HTTP_STATUS,
  // Type definitions
  type ApiVersion,
  type ApiEndpoint,
  type ApiRateLimit,
  type HttpMethod,
  type HttpStatusCode
} from './api.constants';

// Route Constants
export {
  BASE_PATH,
  API_PATH,
  ROUTE_PARAMS,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PRIVATE_ROUTES,
  ERROR_ROUTES,
  // Route helper functions
  isPublicRoute,
  isAuthRoute,
  isPrivateRoute,
  isErrorRoute,
  buildRoute
} from './routes.constants';

// Theme Constants
export {
  ThemeMode,
  ColorScheme,
  THEME_TRANSITION_DURATION,
  DEFAULT_THEME_MODE,
  DEFAULT_COLOR_SCHEME,
  THEME_COLORS,
  COLOR_SCHEMES,
  // Type definitions
  type ThemeColors,
  type ColorOverrides
} from './theme.constants';

// Validation Constants
export {
  // Regex patterns
  EMAIL_REGEX,
  PASSWORD_REGEX,
  NAME_REGEX,
  PROJECT_NAME_REGEX,
  TAG_REGEX,
  // Validation rules
  AUTH_VALIDATION,
  PROJECT_VALIDATION,
  TASK_VALIDATION
} from './validation.constants';

/**
 * Type guard to check if a value is a readonly object
 * @template T - The type of the object
 * @param {T} obj - The object to check
 * @returns {boolean} True if the object is readonly
 */
export const isReadonlyObject = <T extends object>(obj: T): obj is Readonly<T> => {
  return Object.isFrozen(obj);
};

/**
 * Type guard to check if a value is a valid theme mode
 * @param {string} mode - The theme mode to check
 * @returns {boolean} True if the mode is a valid theme mode
 */
export const isValidThemeMode = (mode: string): mode is ThemeMode => {
  return Object.values(ThemeMode).includes(mode as ThemeMode);
};

/**
 * Type guard to check if a value is a valid color scheme
 * @param {string} scheme - The color scheme to check
 * @returns {boolean} True if the scheme is a valid color scheme
 */
export const isValidColorScheme = (scheme: string): scheme is ColorScheme => {
  return Object.values(ColorScheme).includes(scheme as ColorScheme);
};

// Ensure all exported objects are deeply frozen for immutability
Object.values({
  API_ENDPOINTS,
  API_RATE_LIMITS,
  HTTP_METHODS,
  HTTP_STATUS,
  THEME_COLORS,
  COLOR_SCHEMES,
  AUTH_VALIDATION,
  PROJECT_VALIDATION,
  TASK_VALIDATION
}).forEach(obj => {
  if (typeof obj === 'object' && obj !== null) {
    Object.freeze(obj);
    Object.values(obj).forEach(val => {
      if (typeof val === 'object' && val !== null) {
        Object.freeze(val);
      }
    });
  }
});