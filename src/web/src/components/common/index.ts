/**
 * @fileoverview Barrel file exporting common UI components implementing Material Design 3
 * principles with comprehensive accessibility support (WCAG 2.1 Level AA compliance).
 * Components follow atomic design methodology for consistent reuse across the application.
 * @version 1.0.0
 */

// -----------------------------------------------------------------------------
// Component Exports
// -----------------------------------------------------------------------------

export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Input } from './Input';
export type { InputProps } from './Input';

// -----------------------------------------------------------------------------
// Component Documentation
// -----------------------------------------------------------------------------

/**
 * Common UI Components
 * 
 * This module exports reusable UI components that implement Material Design 3
 * principles and meet WCAG 2.1 Level AA accessibility standards. All components:
 * 
 * 1. Follow atomic design methodology
 * 2. Support keyboard navigation
 * 3. Include ARIA labels and landmarks
 * 4. Maintain proper color contrast ratios
 * 5. Support screen readers
 * 6. Handle RTL layouts
 * 7. Support reduced motion preferences
 * 
 * @example
 * import { Avatar, Button, Input } from '@/components/common';
 * 
 * const MyComponent = () => (
 *   <div>
 *     <Avatar user={currentUser} />
 *     <Button variant="primary">Click Me</Button>
 *     <Input 
 *       label="Username"
 *       type="text"
 *       required
 *       aria-label="Enter your username"
 *     />
 *   </div>
 * );
 */

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

/**
 * Re-export common types and interfaces for component props to maintain
 * consistent type definitions across the application.
 */
export type {
  // Avatar Types
  User,
  UserRole,
  UserStatus
} from '../../types/user.types';

// -----------------------------------------------------------------------------
// Validation Exports
// -----------------------------------------------------------------------------

/**
 * Re-export validation utilities used by form components to maintain
 * consistent validation behavior.
 */
export {
  validateEmail,
  validatePassword,
  sanitizeInput
} from '../../utils/validation.utils';

export type { ValidationResult } from '../../utils/validation.utils';