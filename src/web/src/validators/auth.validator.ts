/**
 * @fileoverview Authentication validation schemas and functions using Yup
 * Implements comprehensive validation for authentication flows with enhanced
 * security, accessibility, and compliance features.
 * @version 1.0.0
 */

import { object, string, ValidationError, addMethod } from 'yup'; // v1.3.0
import i18next from 'i18next'; // v23.0.0
import { AuthCredentials, ValidationMetadata } from '../types/auth.types';
import { AUTH_VALIDATION } from '../constants/validation.constants';

/**
 * Validation metadata for rate limiting and security tracking
 */
const VALIDATION_METADATA = {
  rateLimitWindow: 300, // 5 minutes in seconds
  maxAttempts: 5,
  backoffMultiplier: 2,
  lockoutDuration: 900 // 15 minutes in seconds
} as const;

/**
 * Error codes for authentication validation
 */
const ERROR_CODES = {
  INVALID_EMAIL: 'AUTH001',
  WEAK_PASSWORD: 'AUTH002',
  RATE_LIMITED: 'AUTH003',
  INVALID_MFA: 'AUTH004',
  ACCOUNT_LOCKED: 'AUTH005'
} as const;

/**
 * Interface for enhanced validation results with security metadata
 */
interface ValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: {
    remainingAttempts?: number;
    lockoutTime?: number;
    requiresMfa?: boolean;
  };
}

/**
 * Custom Yup method for password history validation
 */
addMethod(string, 'notInHistory', function (message) {
  return this.test('notInHistory', message, async function (value) {
    if (!value) return true;
    
    // Mock password history check - in production, this would check against actual password history
    const mockPasswordHistory = ['$2a$12$oldHash1', '$2a$12$oldHash2'];
    const isInHistory = mockPasswordHistory.includes(value);
    
    return !isInHistory || this.createError({
      message: AUTH_VALIDATION.PASSWORD.messages.history
    });
  });
});

/**
 * Enhanced login validation schema with rate limiting and security features
 */
export const loginSchema = object({
  email: string()
    .required(AUTH_VALIDATION.EMAIL.messages.required)
    .matches(AUTH_VALIDATION.EMAIL.pattern, AUTH_VALIDATION.EMAIL.messages.pattern)
    .max(AUTH_VALIDATION.EMAIL.maxLength, AUTH_VALIDATION.EMAIL.messages.maxLength)
    .trim()
    .lowercase(),
    
  password: string()
    .required(AUTH_VALIDATION.PASSWORD.messages.required)
    .min(
      AUTH_VALIDATION.PASSWORD.minLength,
      AUTH_VALIDATION.PASSWORD.messages.minLength
    )
    .max(
      AUTH_VALIDATION.PASSWORD.maxLength,
      AUTH_VALIDATION.PASSWORD.messages.maxLength
    )
    .matches(
      AUTH_VALIDATION.PASSWORD.pattern,
      AUTH_VALIDATION.PASSWORD.messages.pattern
    ),
    
  mfaCode: string()
    .when('requiresMfa', {
      is: true,
      then: string()
        .required(AUTH_VALIDATION.MFA_CODE.messages.required)
        .matches(AUTH_VALIDATION.MFA_CODE.pattern, AUTH_VALIDATION.MFA_CODE.messages.pattern)
    })
}).required();

/**
 * Enhanced registration validation schema with security and GDPR compliance
 */
export const registerSchema = object({
  email: string()
    .required(AUTH_VALIDATION.EMAIL.messages.required)
    .matches(AUTH_VALIDATION.EMAIL.pattern, AUTH_VALIDATION.EMAIL.messages.pattern)
    .max(AUTH_VALIDATION.EMAIL.maxLength, AUTH_VALIDATION.EMAIL.messages.maxLength)
    .trim()
    .lowercase(),
    
  password: string()
    .required(AUTH_VALIDATION.PASSWORD.messages.required)
    .min(
      AUTH_VALIDATION.PASSWORD.minLength,
      AUTH_VALIDATION.PASSWORD.messages.minLength
    )
    .max(
      AUTH_VALIDATION.PASSWORD.maxLength,
      AUTH_VALIDATION.PASSWORD.messages.maxLength
    )
    .matches(
      AUTH_VALIDATION.PASSWORD.pattern,
      AUTH_VALIDATION.PASSWORD.messages.pattern
    )
    .notInHistory(AUTH_VALIDATION.PASSWORD.messages.history),
    
  name: string()
    .required(AUTH_VALIDATION.NAME.messages.required)
    .min(
      AUTH_VALIDATION.NAME.minLength,
      AUTH_VALIDATION.NAME.messages.minLength
    )
    .max(
      AUTH_VALIDATION.NAME.maxLength,
      AUTH_VALIDATION.NAME.messages.maxLength
    )
    .matches(
      AUTH_VALIDATION.NAME.pattern,
      AUTH_VALIDATION.NAME.messages.pattern
    ),
    
  acceptTerms: string()
    .required('You must accept the terms and conditions')
    .oneOf(['true'], 'You must accept the terms and conditions'),
    
  gdprConsent: string()
    .required('GDPR consent is required')
    .oneOf(['true'], 'GDPR consent is required')
}).required();

/**
 * Validates login credentials with rate limiting and security checks
 * @param credentials - Login credentials to validate
 * @param metadata - Validation metadata for rate limiting
 * @returns Validation result with security metadata
 */
export async function validateLoginCredentials(
  credentials: AuthCredentials,
  metadata: ValidationMetadata
): Promise<ValidationResult> {
  try {
    // Check rate limiting
    if (metadata.attemptCount >= VALIDATION_METADATA.maxAttempts) {
      const lockoutTime = metadata.lastAttempt + 
        (VALIDATION_METADATA.lockoutDuration * VALIDATION_METADATA.backoffMultiplier);
      
      return {
        isValid: false,
        errorCode: ERROR_CODES.RATE_LIMITED,
        errorMessage: i18next.t('auth:errors.rateLimited'),
        metadata: {
          lockoutTime,
          remainingAttempts: 0
        }
      };
    }

    // Validate against schema
    await loginSchema.validate(credentials, { abortEarly: false });

    // Additional security checks could be added here
    const requiresMfa = checkMfaRequired(credentials.email);

    return {
      isValid: true,
      metadata: {
        requiresMfa,
        remainingAttempts: VALIDATION_METADATA.maxAttempts - (metadata.attemptCount + 1)
      }
    };

  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        isValid: false,
        errorCode: ERROR_CODES.INVALID_EMAIL,
        errorMessage: error.message,
        metadata: {
          remainingAttempts: VALIDATION_METADATA.maxAttempts - (metadata.attemptCount + 1)
        }
      };
    }
    throw error;
  }
}

/**
 * Validates password complexity against security requirements
 * @param password - Password to validate
 * @returns Validation result with detailed feedback
 */
export function validatePasswordComplexity(password: string): ValidationResult {
  try {
    // Check minimum length
    if (password.length < AUTH_VALIDATION.PASSWORD.minLength) {
      return {
        isValid: false,
        errorCode: ERROR_CODES.WEAK_PASSWORD,
        errorMessage: AUTH_VALIDATION.PASSWORD.messages.minLength
      };
    }

    // Check pattern requirements
    if (!AUTH_VALIDATION.PASSWORD.pattern.test(password)) {
      return {
        isValid: false,
        errorCode: ERROR_CODES.WEAK_PASSWORD,
        errorMessage: AUTH_VALIDATION.PASSWORD.messages.pattern
      };
    }

    // Additional complexity checks could be added here

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errorCode: ERROR_CODES.WEAK_PASSWORD,
      errorMessage: 'Password validation failed'
    };
  }
}

/**
 * Checks if MFA is required for the given email
 * @param email - Email to check
 * @returns Boolean indicating if MFA is required
 */
function checkMfaRequired(email: string): boolean {
  // Mock implementation - in production, this would check against user settings
  // and security policies
  return email.endsWith('@company.com');
}