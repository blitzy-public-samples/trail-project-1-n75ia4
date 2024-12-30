/**
 * @fileoverview Main dashboard layout component implementing Material Design 3 specifications,
 * responsive design, and accessibility features for the task management application.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames'; // v2.3.2
import { useMediaQuery, useTheme } from '@mui/material'; // v5.0.0
import Header from '../components/layout/Header';
import Sidebar from '../components/common/Sidebar';
import { useAuth } from '../hooks/useAuth';
import styles from './DashboardLayout.module.scss';

interface DashboardLayoutProps {
  /** Child components to render in main content area */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Main dashboard layout component implementing Material Design 3 layout structure
 * with responsive behavior and accessibility features.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className
}) => {
  // Authentication state
  const { isAuthenticated, user } = useAuth();

  // Theme and responsive state
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(!isMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsTransitioning(true);
    setIsSidebarOpen(prev => !prev);
    
    // Remove transition class after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300); // Match transition duration
  }, []);

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    // Theme toggle handled by Header component
  }, []);

  // Early return if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className={classNames(
        styles.dashboardLayout,
        {
          [styles['dashboardLayout--sidebarOpen']]: isSidebarOpen,
          [styles['dashboardLayout--mobile']]: isMobile,
          [styles['dashboardLayout--transitioning']]: isTransitioning
        },
        className
      )}
      role="main"
    >
      {/* Header */}
      <Header
        onMenuClick={handleSidebarToggle}
        onThemeToggle={handleThemeToggle}
        className={styles.dashboardLayout__header}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        className={styles.dashboardLayout__sidebar}
        variant={isMobile ? 'temporary' : 'permanent'}
      />

      {/* Main Content */}
      <main
        className={classNames(styles.dashboardLayout__content, {
          [styles['dashboardLayout__content--sidebarOpen']]: isSidebarOpen
        })}
        role="main"
        aria-label="Main content"
      >
        <div className={styles.dashboardLayout__contentInner}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

// SCSS Module
const scssModule = `
.dashboardLayout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
  transition: padding var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);

  &__header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--md-sys-zindex-appbar);
  }

  &__sidebar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    bottom: 0;
    z-index: var(--md-sys-zindex-drawer);
    transition: transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
  }

  &__content {
    flex: 1;
    margin-top: var(--header-height);
    padding: clamp(1rem, 2vw, 1.5rem);
    transition: margin-left var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);

    &Inner {
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
    }

    &--sidebarOpen {
      @media (min-width: 768px) {
        margin-left: var(--sidebar-width);
      }
    }
  }

  // Mobile styles
  &--mobile {
    .dashboardLayout__sidebar {
      transform: translateX(-100%);
    }

    &.dashboardLayout--sidebarOpen {
      .dashboardLayout__sidebar {
        transform: translateX(0);
      }
    }
  }

  // Transition styles
  &--transitioning {
    .dashboardLayout__sidebar,
    .dashboardLayout__content {
      transition: all var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
    }
  }

  // High contrast & accessibility
  @media (prefers-contrast: more) {
    border: 1px solid var(--md-sys-color-outline);
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    &__sidebar,
    &__content {
      transition: none;
    }
  }
}
`;