import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import classNames from 'classnames';
import { formatDate, parseDate, isWithinDateRange, getTimezoneOffset } from '../../utils/date.utils';

// Version comments for external dependencies
// react@18.2.0
// classnames@2.3.2

interface DateValidationRules {
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  customValidator?: (date: Date) => boolean;
}

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
  disabled?: boolean;
  required?: boolean;
  format?: string;
  placeholder?: string;
  errorMessage?: string;
  className?: string;
  id?: string;
  timezone?: string;
  locale?: string;
  validationRules?: DateValidationRules;
  ariaLabel?: string;
  testId?: string;
}

const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const CALENDAR_WIDTH = 320;
const CALENDAR_HEIGHT = 400;

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  required = false,
  format = DEFAULT_DATE_FORMAT,
  placeholder = 'Select date',
  errorMessage,
  className,
  id,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale = 'en-US',
  validationRules,
  ariaLabel,
  testId = 'date-picker',
}) => {
  // State management
  const [inputValue, setInputValue] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date());
  const [validationMessage, setValidationMessage] = useState<string>('');

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Memoized values
  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    });
  }, [locale, timezone]);

  // Initialize input value
  useEffect(() => {
    if (value) {
      setInputValue(formatDate(value, format));
    }
  }, [value, format]);

  // Validation helper
  const validateDate = useCallback((date: Date | null): boolean => {
    if (!date) {
      return !required;
    }

    if (validationRules?.customValidator && !validationRules.customValidator(date)) {
      setValidationMessage('Date does not meet custom validation rules');
      return false;
    }

    if (minDate && maxDate && !isWithinDateRange(date, minDate, maxDate)) {
      setValidationMessage(`Date must be between ${formatDate(minDate, format)} and ${formatDate(maxDate, format)}`);
      return false;
    }

    return true;
  }, [required, validationRules, minDate, maxDate, format]);

  // Event handlers
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    const parsedDate = parseDate(newValue);
    const isDateValid = validateDate(parsedDate);
    
    setIsValid(isDateValid);
    onChange(isDateValid ? parsedDate : null);

    // Announce validation status to screen readers
    if (announceRef.current) {
      announceRef.current.textContent = isDateValid ? 
        'Date is valid' : 
        validationMessage || errorMessage || 'Date is invalid';
    }
  }, [onChange, validateDate, errorMessage, validationMessage]);

  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        if (!isCalendarOpen) {
          setIsCalendarOpen(true);
        }
        event.preventDefault();
        break;
      case 'Escape':
        setIsCalendarOpen(false);
        inputRef.current?.focus();
        event.preventDefault();
        break;
      case 'Tab':
        if (isCalendarOpen) {
          setIsCalendarOpen(false);
        }
        break;
    }
  }, [isCalendarOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Accessibility announcer
  useEffect(() => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', 'polite');
    }
  }, []);

  // Calendar positioning
  const calendarStyle = useMemo(() => {
    if (!inputRef.current) return {};

    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    return {
      position: 'absolute' as const,
      left: `${rect.left}px`,
      top: spaceBelow >= CALENDAR_HEIGHT ? 
        `${rect.bottom + 8}px` : 
        `${rect.top - CALENDAR_HEIGHT - 8}px`,
      width: `${CALENDAR_WIDTH}px`,
    };
  }, [isCalendarOpen]);

  return (
    <div 
      className={classNames('date-picker-container', className, {
        'is-invalid': !isValid,
        'is-disabled': disabled,
      })}
      data-testid={testId}
    >
      <input
        ref={inputRef}
        type="text"
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyboardNavigation}
        onClick={() => !disabled && setIsCalendarOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={classNames('date-picker-input', {
          'has-error': !isValid,
          'is-focused': isFocused,
        })}
        aria-label={ariaLabel || 'Date input'}
        aria-invalid={!isValid}
        aria-required={required}
        aria-describedby={`${id}-error`}
        data-testid={`${testId}-input`}
      />

      {isCalendarOpen && !disabled && (
        <div
          ref={calendarRef}
          className="date-picker-calendar"
          style={calendarStyle}
          role="dialog"
          aria-label="Choose date"
          data-testid={`${testId}-calendar`}
        >
          {/* Calendar implementation would go here */}
        </div>
      )}

      {(!isValid || errorMessage) && (
        <div
          id={`${id}-error`}
          className="date-picker-error"
          role="alert"
          data-testid={`${testId}-error`}
        >
          {errorMessage || validationMessage}
        </div>
      )}

      <div
        ref={announceRef}
        className="visually-hidden"
        role="status"
        aria-live="polite"
      />
    </div>
  );
};

export default DatePicker;