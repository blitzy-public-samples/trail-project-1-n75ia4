/**
 * @fileoverview Barrel file exporting all layout components for the Task Management System.
 * Implements Material Design 3 principles, F-pattern layout organization, and responsive design.
 * @version 1.0.0
 */

// -----------------------------------------------------------------------------
// Layout Component Exports
// -----------------------------------------------------------------------------

/**
 * AuthLayout - Secure authentication layout component
 * Implements Material Design 3 principles with WCAG 2.1 Level AA compliance
 * Features:
 * - Responsive layout with mobile-first approach
 * - Theme-aware with light/dark/high-contrast support
 * - Secure authentication flow structure
 */
export { default as AuthLayout } from './AuthLayout';

/**
 * DashboardLayout - Main application layout component
 * Implements F-pattern layout organization with maximum content width of 1440px
 * Features:
 * - Responsive sidebar navigation
 * - Golden ratio whitespace distribution
 * - Theme-aware component structure
 */
export { default as DashboardLayout } from './DashboardLayout';

/**
 * ErrorLayout - Error page layout component
 * Implements consistent error message presentation with accessibility features
 * Features:
 * - Animated transitions
 * - Accessible error messaging
 * - Responsive error display
 */
export { default as ErrorLayout } from './ErrorLayout';

// -----------------------------------------------------------------------------
// Layout Type Exports
// -----------------------------------------------------------------------------

/**
 * Re-export component prop types for external use
 */
export type { AuthLayoutProps } from './AuthLayout';
export type { DashboardLayoutProps } from './DashboardLayout';
export type { ErrorLayoutProps } from './ErrorLayout';

// -----------------------------------------------------------------------------
// Layout Constants
// -----------------------------------------------------------------------------

/**
 * Layout configuration constants
 */
export const LAYOUT_CONFIG = {
  /** Maximum content width following design specifications */
  maxWidth: 1440,
  
  /** Responsive breakpoints */
  breakpoints: {
    mobile: 320,
    tablet: 768,
    desktop: 1024,
    large: 1440
  },
  
  /** Whitespace ratio following golden ratio */
  spacing: {
    ratio: 1.618,
    base: 8
  }
} as const;