// @version React ^18.2.0
import React from 'react';

/**
 * Interface for icon component props following Material Design 3 specifications
 * and accessibility guidelines
 */
interface IconProps {
  /** Icon size in pixels - defaults to 24px (MD3 standard) */
  size?: number;
  /** Icon color - defaults to currentColor for theme inheritance */
  color?: string;
  /** Optional CSS classes for custom styling */
  className?: string;
  /** Theme variant selection for proper rendering */
  themeVariant?: 'light' | 'dark' | 'high-contrast';
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Optional title for hover tooltip */
  title?: string;
}

/**
 * Constants following Material Design 3 specifications
 */
export const DEFAULT_ICON_SIZE = 24;
export const DEFAULT_ICON_COLOR = 'currentColor';
export const MINIMUM_ICON_SIZE = 16;
export const MAXIMUM_ICON_SIZE = 48;

/**
 * High contrast color values for accessibility compliance
 */
export const HIGH_CONTRAST_COLORS = {
  light: '#000000',
  dark: '#FFFFFF'
} as const;

/**
 * Factory function to create accessible, theme-aware icon components
 * @param IconComponent Base SVG icon component
 * @param themeConfig Theme-specific configurations
 * @returns Enhanced icon component with accessibility and theme support
 */
const createIconComponent = (
  IconComponent: React.FC<IconProps>,
  themeConfig?: {
    lightModeColor?: string;
    darkModeColor?: string;
  }
): React.FC<IconProps> => {
  const EnhancedIcon: React.FC<IconProps> = ({
    size = DEFAULT_ICON_SIZE,
    color = DEFAULT_ICON_COLOR,
    className = '',
    themeVariant = 'light',
    ariaLabel,
    title,
    ...props
  }) => {
    // Validate size constraints
    const validatedSize = Math.min(
      Math.max(size, MINIMUM_ICON_SIZE),
      MAXIMUM_ICON_SIZE
    );

    // Determine color based on theme variant
    let finalColor = color;
    if (themeVariant === 'high-contrast') {
      finalColor = HIGH_CONTRAST_COLORS[themeVariant === 'dark' ? 'dark' : 'light'];
    } else if (themeConfig) {
      finalColor = themeVariant === 'dark' ? 
        themeConfig.darkModeColor || color :
        themeConfig.lightModeColor || color;
    }

    return (
      <IconComponent
        size={validatedSize}
        color={finalColor}
        className={`md3-icon ${className}`}
        aria-label={ariaLabel}
        role="img"
        {...(title && { title })}
        {...props}
      />
    );
  };

  EnhancedIcon.displayName = IconComponent.displayName || IconComponent.name;
  return EnhancedIcon;
};

/**
 * Task-related icon components with theme and accessibility support
 */
export const TaskIcon = createIconComponent(
  ({ size, color, className, ...props }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.11 21 21 20.1 21 19V5C21 3.9 20.11 3 19 3ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
        fill={color}
      />
    </svg>
  ),
  {
    lightModeColor: '#1F1F1F',
    darkModeColor: '#E1E1E1'
  }
);

/**
 * Project management icon components with theme and accessibility support
 */
export const ProjectIcon = createIconComponent(
  ({ size, color, className, ...props }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V6H9.17L11.17 8H20V18Z"
        fill={color}
      />
    </svg>
  ),
  {
    lightModeColor: '#1F1F1F',
    darkModeColor: '#E1E1E1'
  }
);

// Type exports for enhanced developer experience
export type { IconProps };

// Default export for convenient importing
export default {
  TaskIcon,
  ProjectIcon
};