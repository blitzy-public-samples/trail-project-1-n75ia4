import React, { useEffect, useState } from 'react';
import classNames from 'classnames'; // v2.3.2
import '../../styles/animations.scss';

// Type definitions for component props
interface LoadingProps {
  /**
   * Size variant of the loading spinner
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Additional CSS classes to apply
   */
  className?: string;
  
  /**
   * Accessible label for screen readers
   * @default 'Loading content'
   */
  ariaLabel?: string;
  
  /**
   * Enable high contrast mode for better visibility
   * @default false
   */
  highContrast?: boolean;
}

// Constants for spinner configuration
const SPINNER_SIZES = {
  small: '24px',
  medium: '40px',
  large: '56px',
} as const;

const ANIMATION_DURATION = '1.4s';

// CSS custom properties for theming
const THEME_TOKENS = {
  '--spinner-color-light': 'rgba(0, 0, 0, 0.38)',
  '--spinner-color-dark': 'rgba(255, 255, 255, 0.38)',
  '--spinner-color-high-contrast': 'rgba(0, 0, 0, 0.87)',
} as const;

/**
 * Custom hook to detect reduced motion preferences
 * @returns {boolean} Whether reduced motion is preferred
 */
const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Loading spinner component that provides visual feedback during async operations.
 * Implements Material Design 3 principles with accessibility and performance optimizations.
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  className,
  ariaLabel = 'Loading content',
  highContrast = false,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Get spinner dimensions based on size prop
  const getSpinnerSize = (size: LoadingProps['size']): string => {
    return SPINNER_SIZES[size || 'medium'];
  };

  // Dynamic styles for the spinner
  const spinnerStyle = {
    width: getSpinnerSize(size),
    height: getSpinnerSize(size),
    ...THEME_TOKENS,
    animationDuration: prefersReducedMotion ? '0s' : ANIMATION_DURATION,
  };

  // Combine CSS classes
  const spinnerClasses = classNames(
    'loading-spinner',
    {
      'high-contrast': highContrast,
      'rotate': !prefersReducedMotion,
    },
    className
  );

  return (
    <div
      className={spinnerClasses}
      style={spinnerStyle}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy="true"
    >
      {/* Hidden text for screen readers */}
      <span className="visually-hidden">
        {ariaLabel}
      </span>
      
      {/* SVG spinner with proper ARIA attributes */}
      <svg
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          className="spinner-track"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2"
        />
        <circle
          className="spinner-head"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Default export for the Loading component
export default Loading;