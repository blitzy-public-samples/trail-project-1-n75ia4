import React, { useEffect, useRef, useMemo } from 'react';
import classNames from 'classnames';
import { $colors, $theme-colors, $transitions } from '../../styles/variables.scss';

// Types
type ProgressVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
type ProgressSize = 'small' | 'medium' | 'large';

interface ProgressBarProps {
  value?: number;
  min?: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  indeterminate?: boolean;
  animated?: boolean;
  striped?: boolean;
  label?: string;
  ariaLabel?: string;
  reducedMotion?: boolean;
  className?: string;
}

// Constants
const SIZES = {
  small: 4,
  medium: 8,
  large: 12,
};

const ANIMATION_DURATION = {
  progress: 300,
  indeterminate: 2000,
};

/**
 * ProgressBar Component
 * 
 * A highly accessible progress bar component implementing Material Design 3 principles
 * with comprehensive theming and animation support.
 * 
 * @component
 * @example
 * ```tsx
 * <ProgressBar 
 *   value={75} 
 *   variant="primary" 
 *   size="medium" 
 *   label="Loading..."
 * />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  min = 0,
  max = 100,
  variant = 'primary',
  size = 'medium',
  indeterminate = false,
  animated = true,
  striped = false,
  label = '',
  ariaLabel = 'Progress',
  reducedMotion = true,
  className = '',
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const previousValue = useRef<number>(value);

  // Calculate progress percentage
  const percentage = useMemo(() => {
    const clampedValue = Math.min(Math.max(value, min), max);
    return ((clampedValue - min) / (max - min)) * 100;
  }, [value, min, max]);

  // Get theme-aware colors
  const colors = useMemo(() => {
    const getColor = (variantName: ProgressVariant) => {
      switch (variantName) {
        case 'primary':
          return $colors.primary.base;
        case 'secondary':
          return $colors.secondary.base;
        case 'success':
          return $colors.semantic.success;
        case 'warning':
          return $colors.semantic.warning;
        case 'error':
          return $colors.semantic.error;
        default:
          return $colors.primary.base;
      }
    };

    return {
      background: $theme-colors.light.background.secondary,
      foreground: getColor(variant),
    };
  }, [variant]);

  // Handle animation
  useEffect(() => {
    if (!animated || indeterminate || reducedMotion) return;

    const element = progressRef.current;
    if (!element) return;

    const animationDuration = ANIMATION_DURATION.progress;
    element.style.transition = `width ${animationDuration}ms ${$transitions.timing['ease-out']}`;

    // Animate only if value changes
    if (previousValue.current !== value) {
      element.style.width = `${percentage}%`;
      previousValue.current = value;
    }

    return () => {
      element.style.transition = '';
    };
  }, [percentage, animated, indeterminate, reducedMotion]);

  // Compose class names
  const progressClasses = classNames(
    'progress-bar',
    `progress-bar--${size}`,
    {
      'progress-bar--indeterminate': indeterminate,
      'progress-bar--striped': striped,
      'progress-bar--animated': animated && !reducedMotion,
    },
    className
  );

  // Styles
  const containerStyle: React.CSSProperties = {
    height: `${SIZES[size]}px`,
    backgroundColor: colors.background,
    borderRadius: `${SIZES[size]}px`,
    overflow: 'hidden',
  };

  const barStyle: React.CSSProperties = {
    width: indeterminate ? '100%' : `${percentage}%`,
    height: '100%',
    backgroundColor: colors.foreground,
    transition: indeterminate ? 'none' : undefined,
  };

  return (
    <div
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuetext={indeterminate ? 'Loading...' : `${Math.round(percentage)}%`}
      aria-label={ariaLabel}
      aria-busy={indeterminate}
      className={progressClasses}
      style={containerStyle}
    >
      <div
        ref={progressRef}
        className="progress-bar__fill"
        style={barStyle}
      />
      {label && (
        <span className="progress-bar__label" aria-hidden="true">
          {label}
        </span>
      )}
    </div>
  );
};

// Default export
export default ProgressBar;

// CSS Module styles
const styles = `
.progress-bar {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;

  &__fill {
    position: relative;
  }

  &__label {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    color: $theme-colors.light.text.primary;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  &--indeterminate &__fill {
    animation: indeterminate 2s infinite linear;
  }

  &--striped &__fill {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 1rem 1rem;
  }

  &--animated&--striped &__fill {
    animation: progress-bar-stripes 1s linear infinite;
  }
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes progress-bar-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-bar {
    &--animated,
    &--indeterminate {
      animation: none;
    }
  }
}
`;