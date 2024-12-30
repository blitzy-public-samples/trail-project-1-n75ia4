import React, { forwardRef, useRef, useImperativeHandle, useCallback, useEffect } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { debounce } from 'lodash'; // v4.17.21
import '../../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

export interface TextAreaProps {
  id?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  autoResize?: boolean;
  showCharCount?: boolean;
  error?: string;
  rtl?: boolean;
  highContrast?: boolean;
  reduceMotion?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onResize?: (height: number) => void;
}

export interface TextAreaRef {
  focus: () => void;
  blur: () => void;
  select: () => void;
  setSelectionRange: (start: number, end: number) => void;
}

// -----------------------------------------------------------------------------
// Component Definition
// -----------------------------------------------------------------------------

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  id,
  name,
  value = '',
  placeholder,
  className,
  disabled = false,
  readOnly = false,
  required = false,
  rows = 3,
  maxLength,
  autoResize = false,
  showCharCount = false,
  error,
  rtl = false,
  highContrast = false,
  reduceMotion = false,
  ariaLabel,
  ariaDescribedBy,
  onChange,
  onBlur,
  onFocus,
  onResize,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCountId = `${id}-char-count`;
  const errorId = `${id}-error`;

  // Forward ref methods
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur(),
    select: () => textareaRef.current?.select(),
    setSelectionRange: (start: number, end: number) => 
      textareaRef.current?.setSelectionRange(start, end),
  }));

  // Adjust height with performance optimization
  const adjustHeight = useCallback(() => {
    const element = textareaRef.current;
    if (!element || !autoResize) return;

    // Reset height to calculate proper scrollHeight
    element.style.height = 'auto';
    
    // Apply smooth transition unless reduced motion is preferred
    if (!reduceMotion) {
      element.style.transition = 'height 150ms ease-out';
    }

    const newHeight = element.scrollHeight;
    element.style.height = `${newHeight}px`;
    onResize?.(newHeight);
  }, [autoResize, reduceMotion, onResize]);

  // Debounced resize handler for performance
  const debouncedAdjustHeight = useCallback(
    debounce(adjustHeight, 150),
    [adjustHeight]
  );

  // Handle value changes
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(event);
    
    if (autoResize) {
      debouncedAdjustHeight();
    }

    // Announce remaining characters to screen readers when near limit
    if (maxLength && showCharCount) {
      const remaining = maxLength - event.target.value.length;
      if (remaining <= 10) {
        const message = `${remaining} characters remaining`;
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
      }
    }
  }, [onChange, autoResize, debouncedAdjustHeight, maxLength, showCharCount]);

  // Initial height adjustment and cleanup
  useEffect(() => {
    if (autoResize) {
      adjustHeight();
    }
    return () => {
      debouncedAdjustHeight.cancel();
    };
  }, [autoResize, adjustHeight, debouncedAdjustHeight, value]);

  return (
    <div className="textarea-container">
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        className={classNames(
          'textarea',
          {
            'textarea--error': error,
            'textarea--rtl': rtl,
            'textarea--high-contrast': highContrast,
            'textarea--disabled': disabled,
            'textarea--readonly': readOnly,
          },
          className
        )}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        rows={rows}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-describedby={classNames(
          showCharCount && charCountId,
          error && errorId,
          ariaDescribedBy
        )}
        aria-invalid={!!error}
        aria-required={required}
        dir={rtl ? 'rtl' : 'ltr'}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      
      {/* Character count display */}
      {showCharCount && maxLength && (
        <div 
          id={charCountId}
          className="textarea__char-count"
          aria-live="polite"
        >
          {value.length}/{maxLength}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div 
          id={errorId}
          className="textarea__error"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea;