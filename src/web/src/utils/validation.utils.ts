/**
 * @fileoverview Comprehensive validation utility module providing secure form validation,
 * data sanitization, and input validation services across the frontend application.
 * Implements enterprise-grade security features and performance optimizations.
 * @version 1.0.0
 */

import { object, string, date, ValidationError } from 'yup'; // v1.3.0
import DOMPurify from 'dompurify'; // v3.0.0
import { 
  AUTH_VALIDATION, 
  PROJECT_VALIDATION, 
  TASK_VALIDATION 
} from '../constants/validation.constants';
import { AuthCredentials, TokenPayload } from '../types/auth.types';

// Validation result interface with enhanced error reporting
interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, any>;
  score?: number;
  suggestions?: string[];
}

// Enhanced sanitization options interface
interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  enableLogging?: boolean;
}

// Default sanitization configuration
const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  allowedTags: [],
  allowedAttributes: {},
  maxLength: 1000,
  enableLogging: true
};

/**
 * Enhanced email validation with security checks and detailed feedback
 * @param email - Email address to validate
 * @returns ValidationResult with detailed feedback
 */
export const validateEmail = async (email: string): Promise<ValidationResult> => {
  try {
    const schema = object({
      email: string()
        .required(AUTH_VALIDATION.EMAIL.messages.required)
        .matches(AUTH_VALIDATION.EMAIL.pattern, AUTH_VALIDATION.EMAIL.messages.pattern)
        .max(AUTH_VALIDATION.EMAIL.maxLength, AUTH_VALIDATION.EMAIL.messages.maxLength)
    });

    await schema.validate({ email }, { abortEarly: false });

    // Additional security checks
    const domain = email.split('@')[1];
    const isDisposable = await checkDisposableEmail(domain);
    if (isDisposable) {
      return {
        isValid: false,
        error: 'Disposable email addresses are not allowed',
        details: { domain }
      };
    }

    return {
      isValid: true,
      details: { domain }
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        isValid: false,
        error: error.message,
        details: error.value
      };
    }
    return {
      isValid: false,
      error: 'Email validation failed'
    };
  }
};

/**
 * Enhanced password validation with strength analysis and security requirements
 * @param password - Password to validate
 * @returns ValidationResult with strength score and suggestions
 */
export const validatePassword = async (password: string): Promise<ValidationResult> => {
  try {
    const schema = object({
      password: string()
        .required(AUTH_VALIDATION.PASSWORD.messages.required)
        .min(AUTH_VALIDATION.PASSWORD.minLength, AUTH_VALIDATION.PASSWORD.messages.minLength)
        .max(AUTH_VALIDATION.PASSWORD.maxLength, AUTH_VALIDATION.PASSWORD.messages.maxLength)
        .matches(AUTH_VALIDATION.PASSWORD.pattern, AUTH_VALIDATION.PASSWORD.messages.pattern)
    });

    await schema.validate({ password }, { abortEarly: false });

    // Calculate password strength score
    const strengthScore = calculatePasswordStrength(password);
    const suggestions = generatePasswordSuggestions(password, strengthScore);

    return {
      isValid: true,
      score: strengthScore,
      suggestions
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        isValid: false,
        error: error.message,
        score: 0,
        suggestions: ['Use a stronger password']
      };
    }
    return {
      isValid: false,
      error: 'Password validation failed',
      score: 0
    };
  }
};

/**
 * Advanced input sanitization with multiple security layers
 * @param input - Raw input string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export const sanitizeInput = (
  input: string,
  options: SanitizationOptions = DEFAULT_SANITIZATION_OPTIONS
): string => {
  if (!input) return '';

  // Merge options with defaults
  const sanitizationOptions = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };

  // Basic sanitization
  let sanitized = input.trim();

  // Length check
  if (sanitized.length > sanitizationOptions.maxLength!) {
    sanitized = sanitized.slice(0, sanitizationOptions.maxLength!);
  }

  // DOMPurify sanitization
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: sanitizationOptions.allowedTags,
    ALLOWED_ATTR: sanitizationOptions.allowedAttributes
  });

  // Additional security measures
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove any remaining HTML brackets
    .replace(/javascript:/gi, '') // Remove potential JavaScript execution
    .replace(/data:/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, ''); // Remove VBScript

  // Log suspicious inputs if logging is enabled
  if (sanitizationOptions.enableLogging && containsSuspiciousPatterns(input)) {
    logSuspiciousInput(input, sanitized);
  }

  return sanitized;
};

/**
 * Validates project name according to project requirements
 * @param name - Project name to validate
 * @returns ValidationResult
 */
export const validateProjectName = async (name: string): Promise<ValidationResult> => {
  try {
    const schema = object({
      name: string()
        .required(PROJECT_VALIDATION.NAME.messages.required)
        .min(PROJECT_VALIDATION.NAME.minLength, PROJECT_VALIDATION.NAME.messages.minLength)
        .max(PROJECT_VALIDATION.NAME.maxLength, PROJECT_VALIDATION.NAME.messages.maxLength)
        .matches(PROJECT_VALIDATION.NAME.pattern, PROJECT_VALIDATION.NAME.messages.pattern)
    });

    await schema.validate({ name }, { abortEarly: false });
    return { isValid: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        isValid: false,
        error: error.message
      };
    }
    return {
      isValid: false,
      error: 'Project name validation failed'
    };
  }
};

// Private helper functions

/**
 * Checks if an email domain is from a disposable email service
 * @param domain - Email domain to check
 * @returns Promise<boolean>
 */
const checkDisposableEmail = async (domain: string): Promise<boolean> => {
  // Implementation would include checking against a list of known disposable email providers
  // This is a placeholder implementation
  const disposableDomains = ['tempmail.com', 'throwaway.com'];
  return disposableDomains.includes(domain.toLowerCase());
};

/**
 * Calculates password strength score
 * @param password - Password to analyze
 * @returns number (0-100)
 */
const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  
  // Length contribution
  score += Math.min(password.length * 4, 40);
  
  // Character variety contribution
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  
  // Complexity patterns contribution
  if (/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/.test(password)) score += 10;
  if (/(?=.*[^A-Za-z0-9])/.test(password)) score += 10;
  
  return Math.min(score, 100);
};

/**
 * Generates password improvement suggestions
 * @param password - Password to analyze
 * @param score - Current password strength score
 * @returns string[] - Array of suggestions
 */
const generatePasswordSuggestions = (password: string, score: number): string[] => {
  const suggestions: string[] = [];
  
  if (score < 60) {
    if (!/[A-Z]/.test(password)) {
      suggestions.push('Add uppercase letters');
    }
    if (!/[a-z]/.test(password)) {
      suggestions.push('Add lowercase letters');
    }
    if (!/[0-9]/.test(password)) {
      suggestions.push('Add numbers');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      suggestions.push('Add special characters');
    }
    if (password.length < 12) {
      suggestions.push('Make the password longer');
    }
  }
  
  return suggestions;
};

/**
 * Checks for suspicious input patterns
 * @param input - Input to check
 * @returns boolean
 */
const containsSuspiciousPatterns = (input: string): boolean => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /on\w+=/i,
    /eval\(/i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Logs suspicious input attempts
 * @param original - Original input
 * @param sanitized - Sanitized output
 */
const logSuspiciousInput = (original: string, sanitized: string): void => {
  // Implementation would include secure logging mechanism
  console.warn('Suspicious input detected:', {
    timestamp: new Date().toISOString(),
    originalLength: original.length,
    sanitizedLength: sanitized.length,
    containsScript: /<script/i.test(original)
  });
};