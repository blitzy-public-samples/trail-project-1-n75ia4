import React from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import '../../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

export interface ButtonProps {
  /** The content to be rendered inside the button */
  children: React.ReactNode;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outlined' | 'text';
  /** Size variant of the button */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button should take full width of container */
  fullWidth?: boolean;
  /** Optional icon to show before button content */
  startIcon?: React.ReactNode;
  /** Optional icon to show after button content */
  endIcon?: React.ReactNode;
  /** Click handler for the button */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** HTML button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Whether to enable high contrast mode */
  highContrast?: boolean;
  /** Whether to disable ripple effect animation */
  disableRipple?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Theme variant */
  theme?: 'light' | 'dark';
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Button = React.memo<ButtonProps>(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  className,
  ariaLabel,
  highContrast = false,
  disableRipple = false,
  loading = false,
  theme = 'light',
}) => {
  // Generate class names based on props
  const buttonClasses = classNames(
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    {
      'btn--disabled': disabled || loading,
      'btn--full-width': fullWidth,
      'btn--loading': loading,
      'btn--high-contrast': highContrast,
      'btn--no-ripple': disableRipple,
      [`btn--${theme}`]: theme,
    },
    className
  );

  // Handle keyboard interaction
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      !disabled && onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  // Handle click with loading state check
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && onClick) {
      onClick(event);
    }
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={ariaLabel || typeof children === 'string' ? children as string : undefined}
      aria-busy={loading}
      data-theme={theme}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {/* Start Icon */}
      {startIcon && (
        <span className="btn__icon btn__icon--start" aria-hidden="true">
          {startIcon}
        </span>
      )}

      {/* Button Content */}
      <span className="btn__content">
        {children}
      </span>

      {/* End Icon */}
      {endIcon && (
        <span className="btn__icon btn__icon--end" aria-hidden="true">
          {endIcon}
        </span>
      )}

      {/* Loading Indicator */}
      {loading && (
        <span className="btn__loading-indicator" role="progressbar" aria-hidden="true" />
      )}
    </button>
  );
});

// Display name for debugging
Button.displayName = 'Button';

export default Button;