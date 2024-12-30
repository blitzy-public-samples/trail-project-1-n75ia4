/**
 * @fileoverview Core theme constants for the Task Management System
 * @version 1.0.0
 * 
 * This file defines the core theming system constants including:
 * - Theme modes (light, dark, high contrast)
 * - Color schemes (default, brand, color-blind friendly)
 * - WCAG 2.1 Level AA compliant color values
 * - Theme transition configurations
 */

/**
 * Available theme modes for the application
 * @enum {string}
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  HIGH_CONTRAST = 'high-contrast'
}

/**
 * Available color schemes for theme customization
 * @enum {string}
 */
export enum ColorScheme {
  DEFAULT = 'default',
  BRAND = 'brand',
  COLOR_BLIND_SAFE = 'color-blind-safe'
}

/**
 * Duration for theme transition animations
 * @constant {string}
 */
export const THEME_TRANSITION_DURATION = '200ms';

/**
 * Default theme mode for initial application load
 * @constant {ThemeMode}
 */
export const DEFAULT_THEME_MODE = ThemeMode.LIGHT;

/**
 * Default color scheme for initial application load
 * @constant {ColorScheme}
 */
export const DEFAULT_COLOR_SCHEME = ColorScheme.DEFAULT;

/**
 * Core theme colors for each theme mode
 * All color combinations meet WCAG 2.1 Level AA requirements:
 * - Normal text (14px): minimum contrast ratio of 4.5:1
 * - Large text (18px+): minimum contrast ratio of 3:1
 * 
 * @constant {Record<string, ThemeColors>}
 */
export const THEME_COLORS = {
  [ThemeMode.LIGHT]: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#1976D2',
    secondary: '#424242',
    error: '#D32F2F',
    warning: '#FFA000',
    success: '#388E3C',
    info: '#0288D1',
    textPrimary: '#212121',
    textSecondary: '#757575',
    divider: '#E0E0E0',
    elevation: {
      1: 'rgba(0, 0, 0, 0.05)',
      2: 'rgba(0, 0, 0, 0.07)',
      3: 'rgba(0, 0, 0, 0.08)'
    },
    overlay: 'rgba(0, 0, 0, 0.5)'
  },
  [ThemeMode.DARK]: {
    background: '#121212',
    surface: '#1E1E1E',
    primary: '#90CAF9',
    secondary: '#B0BEC5',
    error: '#EF5350',
    warning: '#FFB74D',
    success: '#81C784',
    info: '#4FC3F7',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0BEC5',
    divider: '#424242',
    elevation: {
      1: 'rgba(255, 255, 255, 0.05)',
      2: 'rgba(255, 255, 255, 0.07)',
      3: 'rgba(255, 255, 255, 0.08)'
    },
    overlay: 'rgba(0, 0, 0, 0.7)'
  },
  [ThemeMode.HIGH_CONTRAST]: {
    background: '#000000',
    surface: '#121212',
    primary: '#FFFFFF',
    secondary: '#FFFF00',
    error: '#FF0000',
    warning: '#FFA500',
    success: '#00FF00',
    info: '#00FFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#FFFF00',
    divider: '#FFFFFF',
    elevation: {
      1: 'rgba(255, 255, 255, 0.1)',
      2: 'rgba(255, 255, 255, 0.15)',
      3: 'rgba(255, 255, 255, 0.2)'
    },
    overlay: 'rgba(0, 0, 0, 0.9)'
  }
} as const;

/**
 * Color scheme variations including brand colors and color-blind safe palettes
 * Color-blind safe colors are optimized for deuteranopia and protanopia
 * 
 * @constant {Record<ColorScheme, Partial<ColorOverrides>>}
 */
export const COLOR_SCHEMES = {
  [ColorScheme.DEFAULT]: {},
  [ColorScheme.BRAND]: {
    primary: '#2E5BFF',
    secondary: '#6B7A99',
    accent: '#00C7F2',
    neutral: '#8F9BB3'
  },
  [ColorScheme.COLOR_BLIND_SAFE]: {
    primary: '#0077BB',    // Blue
    error: '#EE7733',      // Orange
    warning: '#EEDD22',    // Yellow
    success: '#009988',    // Teal
    info: '#44CCBB',       // Cyan
    accent: '#AA3377'      // Magenta
  }
} as const;

/**
 * Type definitions for theme colors structure
 */
export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  elevation: {
    1: string;
    2: string;
    3: string;
  };
  overlay: string;
}

/**
 * Type for color scheme overrides
 */
export interface ColorOverrides {
  primary?: string;
  secondary?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
  accent?: string;
  neutral?: string;
}