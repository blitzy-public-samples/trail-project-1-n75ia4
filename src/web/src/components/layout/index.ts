/**
 * @fileoverview Centralized barrel file exporting all layout components and their TypeScript types.
 * Implements Material Design 3 methodology with atomic design principles.
 * @version 1.0.0
 */

// Import layout components and their types
import { Footer } from './Footer';
import type { FooterProps } from './Footer';

import { Header } from './Header';
import type { HeaderProps } from './Header';

import { Navigation } from './Navigation';
import type { NavigationProps } from './Navigation';

import { MainLayout } from './MainLayout';
import type { MainLayoutProps } from './MainLayout';

// Export all layout components
export {
  Footer,
  Header,
  Navigation,
  MainLayout
};

// Export component TypeScript interfaces
export type {
  FooterProps,
  HeaderProps,
  NavigationProps,
  MainLayoutProps
};

/**
 * Layout component configuration based on Material Design 3 specifications
 */
export const LAYOUT_CONFIG = {
  // Maximum content width based on design specifications
  maxWidth: 1440,

  // Spacing based on 8px grid system
  spacing: {
    unit: 8,
    container: {
      mobile: 16,
      tablet: 24,
      desktop: 32
    }
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: 320,
    tablet: 768,
    desktop: 1024,
    large: 1440
  },

  // Navigation dimensions
  navigation: {
    sidebarWidth: 280,
    headerHeight: 64
  },

  // Animation durations
  transitions: {
    default: 300,
    complex: 500
  }
} as const;

/**
 * Layout-specific theme tokens
 */
export const LAYOUT_THEME_TOKENS = {
  elevation: {
    header: 4,
    sidebar: 8,
    modal: 24
  },
  zIndex: {
    header: 1100,
    sidebar: 1200,
    modal: 1300
  }
} as const;

/**
 * Layout accessibility configuration
 */
export const LAYOUT_A11Y_CONFIG = {
  landmarks: {
    header: 'banner',
    navigation: 'navigation',
    main: 'main',
    footer: 'contentinfo'
  },
  reducedMotion: {
    enabled: true,
    duration: 0
  }
} as const;