/**
 * @fileoverview Barrel file exporting authentication-related components with secure
 * authentication flow implementation and Material Design 3 principles.
 * Implements WCAG 2.1 Level AA accessibility standards.
 * @version 1.0.0
 */

// -----------------------------------------------------------------------------
// Component Exports
// -----------------------------------------------------------------------------

export { default as LoginForm } from './LoginForm';
export type { LoginFormProps } from './LoginForm';

export { default as RegisterForm } from './RegisterForm';
export type { RegisterFormProps } from './RegisterForm';

export { default as ForgotPasswordForm } from './ForgotPasswordForm';
export type { ForgotPasswordFormProps } from './ForgotPasswordForm';

export { default as ResetPasswordForm } from './ResetPasswordForm';
export type { ResetPasswordFormProps } from './ResetPasswordForm';

// -----------------------------------------------------------------------------
// Component Documentation
// -----------------------------------------------------------------------------

/**
 * Authentication Components
 * 
 * This module exports secure authentication components that implement:
 * 1. Material Design 3 principles
 * 2. WCAG 2.1 Level AA accessibility standards
 * 3. Comprehensive security features including:
 *    - Rate limiting
 *    - Token rotation
 *    - MFA support
 *    - Input validation
 *    - XSS prevention
 * 4. Internationalization support
 * 5. Error handling and user feedback
 * 
 * @example
 * import { LoginForm, RegisterForm } from '@/components/auth';
 * 
 * const AuthPage = () => (
 *   <div>
 *     <LoginForm 
 *       onSuccess={handleSuccess}
 *       onError={handleError}
 *       ssoEnabled={true}
 *     />
 *   </div>
 * );
 */

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

/**
 * Re-export common types and interfaces for authentication components
 * to maintain consistent type definitions across the application.
 */
export type {
  AuthCredentials,
  AuthTokens,
  AuthProvider,
  TokenPayload,
  ValidationResult
} from '../../types/auth.types';

// -----------------------------------------------------------------------------
// Validation Exports
// -----------------------------------------------------------------------------

/**
 * Re-export validation utilities used by authentication components
 * to maintain consistent validation behavior.
 */
export {
  validateEmail,
  validatePassword,
  validatePasswordComplexity
} from '../../utils/validation.utils';

export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../../validators/auth.validator';