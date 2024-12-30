/**
 * @fileoverview Core theme configuration with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 * 
 * This configuration manages:
 * - Theme modes (light/dark/high-contrast)
 * - Color schemes (default/brand/color-blind safe)
 * - WCAG 2.1 Level AA compliance validation
 * - Accessible color combinations
 * - Theme transitions and persistence
 */

import { 
  ThemeMode, 
  ColorScheme, 
  THEME_COLORS,
  THEME_TRANSITION_DURATION 
} from '../constants/theme.constants';

// Global theme configuration constants
const THEME_DATA_ATTRIBUTE = 'data-theme';
const COLOR_SCHEME_DATA_ATTRIBUTE = 'data-color-scheme';
const MIN_CONTRAST_RATIO = 4.5; // WCAG 2.1 Level AA for normal text
const HIGH_CONTRAST_RATIO = 7; // WCAG 2.1 Level AAA
const THEME_STORAGE_KEY = 'app-theme-preference';

/**
 * Theme configuration interface with WCAG compliance properties
 */
export interface ThemeConfig {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: Record<string, string>;
  transition: number;
  contrast: number;
  isHighContrast: boolean;
  isColorBlindSafe: boolean;
}

/**
 * Calculates relative luminance for WCAG contrast calculations
 * @param hexColor - Color in hexadecimal format
 */
const calculateRelativeLuminance = (hexColor: string): number => {
  const rgb = hexColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!rgb) return 0;

  const [r, g, b] = rgb.slice(1).map(c => {
    const value = parseInt(c, 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Validates color contrast against WCAG 2.1 requirements
 * @param foreground - Foreground color
 * @param background - Background color
 * @param isLargeText - Whether the text is large (18px+)
 */
export const validateColorContrast = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean => {
  const l1 = calculateRelativeLuminance(foreground);
  const l2 = calculateRelativeLuminance(background);
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const requiredRatio = isLargeText ? 3 : MIN_CONTRAST_RATIO;
  
  return ratio >= requiredRatio;
};

/**
 * Retrieves theme configuration with WCAG compliance validation
 * @param mode - Theme mode
 * @param scheme - Color scheme
 */
export const getThemeConfig = (
  mode: ThemeMode = ThemeMode.LIGHT,
  scheme: ColorScheme = ColorScheme.DEFAULT
): ThemeConfig => {
  // Get base colors for the selected mode
  const baseColors = THEME_COLORS[mode];
  const isHighContrast = mode === ThemeMode.HIGH_CONTRAST;
  const isColorBlindSafe = scheme === ColorScheme.COLOR_BLIND_SAFE;

  // Validate critical color combinations
  const validateCriticalColors = () => {
    const criticalPairs = [
      [baseColors.textPrimary, baseColors.background],
      [baseColors.textSecondary, baseColors.background],
      [baseColors.primary, baseColors.background],
      [baseColors.error, baseColors.background]
    ];

    return criticalPairs.every(([fore, back]) => 
      validateColorContrast(fore, back)
    );
  };

  if (!validateCriticalColors()) {
    console.error('Critical color combinations fail WCAG contrast requirements');
  }

  // Construct theme configuration
  const config: ThemeConfig = {
    mode,
    scheme,
    colors: { ...baseColors },
    transition: parseInt(THEME_TRANSITION_DURATION),
    contrast: isHighContrast ? HIGH_CONTRAST_RATIO : MIN_CONTRAST_RATIO,
    isHighContrast,
    isColorBlindSafe
  };

  return config;
};

/**
 * Applies theme configuration to document with proper transitions
 * @param config - Validated theme configuration
 */
export const applyTheme = (config: ThemeConfig): void => {
  const root = document.documentElement;
  const { colors, transition, mode, scheme } = config;

  // Prepare for transition
  root.style.setProperty('--theme-transition-duration', `${transition}ms`);

  // Set theme attributes
  root.setAttribute(THEME_DATA_ATTRIBUTE, mode);
  root.setAttribute(COLOR_SCHEME_DATA_ATTRIBUTE, scheme);

  // Apply color variables
  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(`--color-${key}`, value);
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        root.style.setProperty(`--color-${key}-${subKey}`, subValue);
      });
    }
  });

  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', colors.background);
  }

  // Store theme preference
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
    mode,
    scheme
  }));

  // Dispatch theme change event
  window.dispatchEvent(new CustomEvent('themechange', {
    detail: { mode, scheme, isHighContrast: config.isHighContrast }
  }));
};

/**
 * Retrieves stored theme preference
 */
export const getStoredThemePreference = (): {
  mode: ThemeMode;
  scheme: ColorScheme;
} | null => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Initializes theme system with stored or system preferences
 */
export const initializeTheme = (): void => {
  const stored = getStoredThemePreference();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;

  const mode = stored?.mode || 
    (prefersHighContrast ? ThemeMode.HIGH_CONTRAST :
     prefersDark ? ThemeMode.DARK : ThemeMode.LIGHT);
  
  const scheme = stored?.scheme || ColorScheme.DEFAULT;

  const config = getThemeConfig(mode, scheme);
  applyTheme(config);
};