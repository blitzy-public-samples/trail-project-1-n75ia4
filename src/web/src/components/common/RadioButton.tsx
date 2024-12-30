import React, { useCallback, useRef, useEffect, memo } from 'react';
import classNames from 'classnames';

// Version comments for third-party dependencies
// react: ^18.2.0
// classnames: ^2.3.2

interface RadioButtonProps {
  /** Unique identifier for the radio button */
  id: string;
  /** Name attribute for form grouping */
  name: string;
  /** Current value of the radio button */
  value: string;
  /** Label text for the radio button */
  label: string;
  /** Whether the radio button is currently checked */
  checked?: boolean;
  /** Whether the radio button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Enable high contrast mode */
  highContrast?: boolean;
  /** Current theme (light/dark) */
  theme?: 'light' | 'dark';
  /** Callback fired when radio button value changes */
  onChange?: (value: string) => void;
  /** ARIA label (if different from visible label) */
  'aria-label'?: string;
  /** ID of element describing the radio button */
  'aria-describedby'?: string;
}

/**
 * A fully accessible radio button component implementing Material Design 3 principles.
 * Supports keyboard navigation, screen readers, high contrast mode, and RTL layouts.
 */
export const RadioButton = memo(({
  id,
  name,
  value,
  label,
  checked = false,
  disabled = false,
  className,
  highContrast = false,
  theme = 'light',
  onChange,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy
}: RadioButtonProps) => {
  // Refs for DOM access
  const inputRef = useRef<HTMLInputElement>(null);
  const radioGroupRef = useRef<HTMLDivElement>(null);

  // Handle radio button change
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (disabled) return;

    // Update state and trigger callback
    if (onChange) {
      onChange(value);
    }

    // Announce change to screen readers
    const announcement = `Selected ${label}`;
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 1000);
  }, [disabled, label, onChange, value]);

  // Handle keyboard navigation
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (onChange) onChange(value);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        const nextInput = radioGroupRef.current?.querySelector<HTMLInputElement>(
          'input[type="radio"]:not([disabled]):not(:checked)'
        );
        nextInput?.focus();
        nextInput?.click();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        const prevInput = radioGroupRef.current?.querySelector<HTMLInputElement>(
          'input[type="radio"]:not([disabled]):not(:checked)'
        );
        prevInput?.focus();
        prevInput?.click();
        break;
    }
  }, [disabled, onChange, value]);

  // Set up keyboard event listeners
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('keydown', handleKeyPress as unknown as EventListener);
    return () => {
      input.removeEventListener('keydown', handleKeyPress as unknown as EventListener);
    };
  }, [handleKeyPress]);

  // Generate component classes
  const radioClasses = classNames(
    'radio-button',
    {
      'radio-button--checked': checked,
      'radio-button--disabled': disabled,
      'radio-button--high-contrast': highContrast,
      [`radio-button--${theme}`]: theme,
      'radio-button--rtl': document.dir === 'rtl'
    },
    className
  );

  return (
    <div 
      ref={radioGroupRef}
      className={radioClasses}
      data-testid="radio-button"
    >
      <input
        ref={inputRef}
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="radio-button__input"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy}
        role="radio"
      />
      <label 
        htmlFor={id}
        className="radio-button__label"
      >
        <span className="radio-button__control">
          <span className="radio-button__inner-circle" />
        </span>
        <span className="radio-button__text">{label}</span>
      </label>
    </div>
  );
});

RadioButton.displayName = 'RadioButton';

export type { RadioButtonProps };