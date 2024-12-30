/**
 * @fileoverview A reusable form input component implementing Material Design 3 principles
 * with comprehensive validation, accessibility features, and real-time feedback.
 * @version 1.0.0
 */

import React, { forwardRef, useCallback, useState, useEffect, useMemo } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import debounce from 'lodash/debounce'; // v4.17.21
import { useForm, ValidationRules } from '../../hooks/useForm';
import styles from './input.module.scss';

// Input types supported by the component
type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';

// Input validation state interface
interface ValidationState {
  isValid: boolean;
  error?: string;
  isTouched: boolean;
}

// Props interface with comprehensive options
interface InputProps {
  /** Unique identifier for the input */
  id: string;
  /** Input name for form submission */
  name: string;
  /** Input type */
  type?: InputType;
  /** Current input value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Autocomplete attribute */
  autoComplete?: string;
  /** Maximum length for text input */
  maxLength?: number;
  /** Validation rules */
  validationRules?: ValidationRules;
  /** Change event handler */
  onChange: (value: string) => void;
  /** Blur event handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Focus event handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA describedby */
  'aria-describedby'?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Material Design 3 compliant input component with comprehensive validation and accessibility
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  id,
  name,
  type = 'text',
  value,
  placeholder,
  label,
  error,
  disabled = false,
  required = false,
  autoComplete,
  maxLength,
  validationRules,
  onChange,
  onBlur,
  onFocus,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'data-testid': testId,
  ...props
}, ref) => {
  // State management
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    isValid: true,
    isTouched: false
  });

  // Get validation function from useForm hook
  const { validateField } = useForm({
    initialValues: { [name]: value },
    validationSchema: validationRules
  });

  // Debounced validation handler
  const debouncedValidate = useMemo(
    () => debounce(async (value: string) => {
      if (!validationRules) return;

      const result = await validateField(name, value);
      setValidation(prev => ({
        ...prev,
        isValid: result.isValid,
        error: result.error
      }));
    }, 300),
    [validateField, name]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedValidate.cancel();
    };
  }, [debouncedValidate]);

  // Handle value changes
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Validate maxLength
    if (maxLength && newValue.length > maxLength) return;
    
    onChange(newValue);
    debouncedValidate(newValue);
  }, [onChange, debouncedValidate, maxLength]);

  // Handle focus events
  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(event);
  }, [onFocus]);

  // Handle blur events
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setValidation(prev => ({ ...prev, isTouched: true }));
    onBlur?.(event);
  }, [onBlur]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Compute input classes
  const inputClasses = classNames(
    styles.input,
    {
      [styles['input--focused']]: isFocused,
      [styles['input--error']]: (validation.isTouched && !validation.isValid) || error,
      [styles['input--disabled']]: disabled,
      [styles['input--with-icon']]: type === 'password',
      [styles['input--rtl']]: document.dir === 'rtl'
    },
    className
  );

  // Compute error message for display
  const displayError = error || (validation.isTouched ? validation.error : undefined);

  // Generate unique IDs for accessibility
  const inputId = `input-${id}`;
  const errorId = `error-${id}`;
  const helperId = `helper-${id}`;

  return (
    <div className={styles.inputContainer}>
      {label && (
        <label
          htmlFor={inputId}
          className={styles.input__label}
        >
          {label}
          {required && <span className={styles.input__required}>*</span>}
        </label>
      )}

      <div className={styles.input__wrapper}>
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type === 'password' && showPassword ? 'text' : type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={inputClasses}
          aria-label={ariaLabel || label}
          aria-invalid={!validation.isValid || !!error}
          aria-required={required}
          aria-describedby={classNames(
            displayError ? errorId : undefined,
            maxLength ? helperId : undefined,
            ariaDescribedby
          )}
          data-testid={testId}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {type === 'password' && (
          <button
            type="button"
            className={styles.input__icon}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        )}

        {maxLength && (
          <div
            id={helperId}
            className={styles.input__counter}
            aria-live="polite"
          >
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      {displayError && (
        <div
          id={errorId}
          className={styles.input__error}
          role="alert"
        >
          {displayError}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;