import React, { useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames';
import styles from '../../styles/components.scss';

// Version of external dependencies used
// classnames: ^2.3.2
// react: ^18.2.0

interface CheckboxProps {
  /** Current checked state of the checkbox */
  checked: boolean;
  /** Callback function when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Accessible label text for the checkbox */
  label: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Input name attribute for form submission */
  name?: string;
  /** Unique identifier for the checkbox and label association */
  id?: string;
  /** Additional CSS class names for custom styling */
  className?: string;
  /** Whether the checkbox is required in a form */
  required?: boolean;
  /** Error message to display for validation feedback */
  error?: string;
  /** Custom aria-label for enhanced accessibility */
  ariaLabel?: string;
}

/**
 * A controlled checkbox component that follows Material Design 3 guidelines
 * with comprehensive accessibility features and theme support.
 *
 * @component
 * @example
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onChange={handleChange}
 *   label="Accept terms and conditions"
 *   required
 * />
 * ```
 */
const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  name,
  id = `checkbox-${Math.random().toString(36).substr(2, 9)}`,
  className,
  required = false,
  error,
  ariaLabel,
}) => {
  // Refs for DOM elements
  const inputRef = useRef<HTMLInputElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);

  // Handle ripple effect cleanup
  useEffect(() => {
    return () => {
      if (rippleRef.current) {
        rippleRef.current.remove();
      }
    };
  }, []);

  /**
   * Handles the checkbox state change with proper event handling
   * and accessibility considerations.
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      const newChecked = event.target.checked;
      onChange(newChecked);

      // Create ripple effect
      if (rippleRef.current) {
        rippleRef.current.classList.add(styles['checkbox__ripple--active']);
        setTimeout(() => {
          if (rippleRef.current) {
            rippleRef.current.classList.remove(styles['checkbox__ripple--active']);
          }
        }, 300); // Match Material Design ripple duration
      }
    }
  }, [disabled, onChange]);

  /**
   * Handles keyboard interactions for accessibility
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!disabled && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      if (inputRef.current) {
        inputRef.current.click();
      }
    }
  }, [disabled]);

  // Compute component classes
  const checkboxClasses = classNames(
    styles.checkbox,
    {
      [styles['checkbox--disabled']]: disabled,
      [styles['checkbox--error']]: error,
      [styles['checkbox--checked']]: checked,
    },
    className
  );

  return (
    <div className={checkboxClasses}>
      <label 
        className={styles.checkbox__label}
        htmlFor={id}
      >
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          required={required}
          className={styles.checkbox__input}
          aria-label={ariaLabel || label}
          aria-invalid={!!error}
          aria-required={required}
          data-testid="checkbox-input"
        />
        <span 
          className={styles.checkbox__checkmark}
          ref={rippleRef}
          aria-hidden="true"
        />
        <span className={styles.checkbox__text}>
          {label}
          {required && (
            <span 
              className={styles['checkbox__required']}
              aria-hidden="true"
            >
              *
            </span>
          )}
        </span>
      </label>
      {error && (
        <div 
          className={styles.checkbox__error}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
};

// Performance optimization
export default React.memo(Checkbox);