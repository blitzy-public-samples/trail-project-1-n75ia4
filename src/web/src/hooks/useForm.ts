/**
 * @fileoverview Advanced React hook for secure form state management with real-time validation,
 * accessibility support, and comprehensive error tracking. Implements WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'; // v18.2.0
import { ValidationError, reach } from 'yup'; // v1.3.0
import debounce from 'lodash/debounce'; // v4.17.21

import { 
  validateEmail, 
  validatePassword, 
  validateDate, 
  sanitizeInput, 
  ValidationResult 
} from '../utils/validation.utils';
import { showNotification, NotificationType } from './useNotification';
import { loginSchema, registerSchema } from '../validators/auth.validator';

// Interfaces
interface UseFormConfig<T extends Record<string, any>> {
  initialValues: T;
  validationSchema?: any;
  onSubmit: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  enableRealTimeValidation?: boolean;
  validationDebounceMs?: number;
  enableAccessibilityAnnouncements?: boolean;
  securityConfig?: {
    enableInputSanitization?: boolean;
    maxValidationAttempts?: number;
    validationTimeout?: number;
  };
}

interface FormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  validationState: {
    lastValidated: number;
    attempts: number;
    isValidating: boolean;
  };
  securityContext: {
    sanitizationEnabled: boolean;
    validationAttempts: Record<keyof T, number>;
    lastValidationTimestamp: number;
  };
}

// Default configuration
const DEFAULT_CONFIG = {
  validateOnChange: true,
  validateOnBlur: true,
  enableRealTimeValidation: true,
  validationDebounceMs: 300,
  enableAccessibilityAnnouncements: true,
  securityConfig: {
    enableInputSanitization: true,
    maxValidationAttempts: 3,
    validationTimeout: 5000
  }
};

/**
 * Advanced form management hook with security and accessibility features
 * @template T - Type of form values
 * @param config - Form configuration options
 * @returns Form state and handlers
 */
export function useForm<T extends Record<string, any>>(
  config: UseFormConfig<T>
) {
  // Merge configuration with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    initialValues,
    validationSchema,
    onSubmit,
    validateOnChange,
    validateOnBlur,
    enableRealTimeValidation,
    validationDebounceMs,
    enableAccessibilityAnnouncements,
    securityConfig
  } = finalConfig;

  // Initialize form state
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {} as Record<keyof T, string>,
    touched: {} as Record<keyof T, boolean>,
    isSubmitting: false,
    isValid: false,
    isDirty: false,
    validationState: {
      lastValidated: 0,
      attempts: 0,
      isValidating: false
    },
    securityContext: {
      sanitizationEnabled: securityConfig.enableInputSanitization,
      validationAttempts: {} as Record<keyof T, number>,
      lastValidationTimestamp: Date.now()
    }
  });

  // Accessibility announcer ref
  const ariaAnnouncerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Validates a single field with security checks
   * @param name - Field name
   * @param value - Field value
   * @returns Validation result
   */
  const validateField = useCallback(async (
    name: keyof T,
    value: any
  ): Promise<ValidationResult> => {
    if (!validationSchema) return { isValid: true };

    try {
      // Check validation attempts
      const attempts = formState.securityContext.validationAttempts[name] || 0;
      if (attempts >= securityConfig.maxValidationAttempts) {
        throw new Error(`Maximum validation attempts exceeded for field ${String(name)}`);
      }

      // Sanitize input if enabled
      const sanitizedValue = securityConfig.enableInputSanitization
        ? sanitizeInput(value)
        : value;

      // Get field validation schema
      const fieldSchema = reach(validationSchema, String(name));
      await fieldSchema.validate(sanitizedValue);

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
        error: 'Validation failed'
      };
    }
  }, [validationSchema, formState.securityContext.validationAttempts, securityConfig]);

  /**
   * Debounced field validation for performance
   */
  const debouncedValidateField = useMemo(
    () => debounce(validateField, validationDebounceMs),
    [validateField, validationDebounceMs]
  );

  /**
   * Announces form updates to screen readers
   */
  const announceToScreenReader = useCallback((message: string) => {
    if (!enableAccessibilityAnnouncements || !ariaAnnouncerRef.current) return;
    ariaAnnouncerRef.current.textContent = message;
  }, [enableAccessibilityAnnouncements]);

  /**
   * Handles field change events with validation
   */
  const handleChange = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, [name]: value },
      isDirty: true,
      touched: { ...prev.touched, [name]: true }
    }));

    if (validateOnChange && enableRealTimeValidation) {
      const result = await debouncedValidateField(name as keyof T, value);
      
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [name]: result.isValid ? '' : (result.error || '')
        },
        securityContext: {
          ...prev.securityContext,
          validationAttempts: {
            ...prev.securityContext.validationAttempts,
            [name]: (prev.securityContext.validationAttempts[name] || 0) + 1
          }
        }
      }));

      if (!result.isValid && enableAccessibilityAnnouncements) {
        announceToScreenReader(`Error in ${name}: ${result.error}`);
      }
    }
  }, [
    validateOnChange,
    enableRealTimeValidation,
    debouncedValidateField,
    announceToScreenReader
  ]);

  /**
   * Handles field blur events
   */
  const handleBlur = useCallback(async (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = event.target;

    setFormState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: true }
    }));

    if (validateOnBlur) {
      const result = await validateField(name as keyof T, formState.values[name]);
      
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [name]: result.isValid ? '' : (result.error || '')
        }
      }));
    }
  }, [validateOnBlur, validateField, formState.values]);

  /**
   * Handles form submission with validation
   */
  const handleSubmit = useCallback(async (
    event?: React.FormEvent<HTMLFormElement>
  ) => {
    if (event) {
      event.preventDefault();
    }

    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      validationState: {
        ...prev.validationState,
        isValidating: true
      }
    }));

    try {
      if (validationSchema) {
        await validationSchema.validate(formState.values, { abortEarly: false });
      }

      await onSubmit(formState.values);

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isValid: true,
        validationState: {
          lastValidated: Date.now(),
          attempts: 0,
          isValidating: false
        }
      }));

      if (enableAccessibilityAnnouncements) {
        announceToScreenReader('Form submitted successfully');
      }
    } catch (error) {
      const errors = error instanceof ValidationError
        ? error.inner.reduce((acc, err) => ({
            ...acc,
            [err.path!]: err.message
          }), {})
        : { submit: 'Form submission failed' };

      setFormState(prev => ({
        ...prev,
        errors: errors as Record<keyof T, string>,
        isSubmitting: false,
        isValid: false,
        validationState: {
          ...prev.validationState,
          attempts: prev.validationState.attempts + 1,
          isValidating: false
        }
      }));

      if (enableAccessibilityAnnouncements) {
        announceToScreenReader('Form submission failed. Please check the errors.');
      }

      showNotification({
        message: 'Please correct the errors in the form',
        type: NotificationType.ERROR
      });
    }
  }, [
    validationSchema,
    formState.values,
    onSubmit,
    enableAccessibilityAnnouncements,
    announceToScreenReader
  ]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {} as Record<keyof T, string>,
      touched: {} as Record<keyof T, boolean>,
      isSubmitting: false,
      isValid: false,
      isDirty: false,
      validationState: {
        lastValidated: 0,
        attempts: 0,
        isValidating: false
      },
      securityContext: {
        sanitizationEnabled: securityConfig.enableInputSanitization,
        validationAttempts: {} as Record<keyof T, number>,
        lastValidationTimestamp: Date.now()
      }
    });
  }, [initialValues, securityConfig.enableInputSanitization]);

  // Set up accessibility announcer
  useEffect(() => {
    if (!enableAccessibilityAnnouncements) return;

    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'alert');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
    ariaAnnouncerRef.current = announcer;

    return () => {
      document.body.removeChild(announcer);
    };
  }, [enableAccessibilityAnnouncements]);

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateField
  };
}