/**
 * @fileoverview Central typography configuration for the Task Management System
 * Implements fluid typography, accessibility standards, and responsive design
 * @version 1.0.0
 */

/**
 * Font family configurations with comprehensive fallback chains
 * Ensures cross-platform compatibility and consistent rendering
 */
export const fontFamilies = {
  primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  secondary: '"Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
  monospace: '"Fira Code", "Consolas", "Monaco", "Andale Mono", monospace',
  fallback: {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  }
} as const;

/**
 * Font size configurations implementing fluid typography
 * Base size: 16px (1rem) with golden ratio scale (1.618)
 */
export const fontSizes = {
  base: '16px',
  scale: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  },
  heading: {
    h1: 'clamp(2.25rem, 5vw, 3rem)',      // 36px - 48px
    h2: 'clamp(1.875rem, 4vw, 2.25rem)',  // 30px - 36px
    h3: 'clamp(1.5rem, 3vw, 1.875rem)',   // 24px - 30px
    h4: 'clamp(1.25rem, 2vw, 1.5rem)',    // 20px - 24px
    h5: 'clamp(1.125rem, 1.5vw, 1.25rem)', // 18px - 20px
    h6: 'clamp(1rem, 1vw, 1.125rem)'      // 16px - 18px
  },
  responsive: {
    mobile: {
      base: '14px',
      scale: 1.2 // Smaller scale for mobile
    },
    tablet: {
      base: '15px',
      scale: 1.333 // Perfect fourth scale
    },
    desktop: {
      base: '16px',
      scale: 1.618 // Golden ratio
    }
  }
} as const;

/**
 * Font weight configurations following Material Design guidelines
 * Ensures consistent visual hierarchy and accessibility
 */
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
} as const;

/**
 * Line height configurations optimized for readability
 * Follows WCAG 2.1 Level AA guidelines for text spacing
 */
export const lineHeights = {
  body: 1.5,      // Default body text
  heading: 1.25,  // Tighter for headings
  code: 1.7,      // Wider for code blocks
  compact: 1.2,   // Utility class for tight spaces
  relaxed: 1.75   // Enhanced readability for long text
} as const;

/**
 * Letter spacing configurations for typography refinement
 * Values in em units for proportional scaling
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em'
} as const;

/**
 * Print-specific typography configurations
 * Optimized for physical media output
 */
export const printTypography = {
  fontSizes: {
    body: '12pt',
    heading: {
      h1: '24pt',
      h2: '20pt',
      h3: '16pt',
      h4: '14pt',
      h5: '12pt',
      h6: '12pt'
    }
  },
  lineHeights: {
    body: 1.4,
    heading: 1.2
  }
} as const;

/**
 * Breakpoint-specific typography configurations
 * Matches design system breakpoints
 */
export const breakpoints = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px'
} as const;

/**
 * Typography utility functions
 */
export const calculateFluidSize = (
  minSize: number,
  maxSize: number,
  minWidth: number = 320,
  maxWidth: number = 1440
): string => {
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minSize;
  
  return `clamp(${minSize}px, ${yAxisIntersection}px + ${slope * 100}vw, ${maxSize}px)`;
};

/**
 * Accessibility-focused typography configurations
 * Ensures WCAG 2.1 Level AA compliance
 */
export const a11yTypography = {
  minScale: 1.2,  // Minimum scaling between text sizes
  bodyContrast: 4.5, // Minimum contrast ratio for body text
  headingContrast: 3, // Minimum contrast ratio for large text
  minTapTarget: '44px', // Minimum touch target size
  preferredTextWidth: '66ch' // Optimal line length for readability
} as const;