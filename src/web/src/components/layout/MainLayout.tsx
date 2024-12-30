/**
 * @fileoverview Main layout component implementing Material Design 3 specifications,
 * responsive design, accessibility standards, and secure content rendering.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useMediaQuery, Box, Container } from '@mui/material';
import classNames from 'classnames';
import Header from './Header';
import Footer from './Footer';
import Sidebar from '../common/Sidebar';
import useTheme from '../../hooks/useTheme';
import styles from '../../styles/components.scss';

// Layout configuration constants
const LAYOUT_MAX_WIDTH = 1440;
const SIDEBAR_WIDTH = 280;
const GOLDEN_RATIO = 1.618;

interface MainLayoutProps {
  /** Child components to render in main content area */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Authentication state for secure content rendering */
  isAuthenticated: boolean;
  /** Accessibility preference for animations */
  reducedMotion?: boolean;
}

/**
 * Main layout component providing core application structure with comprehensive
 * accessibility, responsive design, and security features.
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className,
  isAuthenticated,
  reducedMotion = false
}) => {
  // Theme and responsive state management
  const { themeMode, isHighContrast } = useTheme();
  const isMobile = useMediaQuery(`(max-width: 768px)`);
  const isTablet = useMediaQuery(`(max-width: 1024px)`);
  
  // Sidebar state management
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isLoading, setIsLoading] = useState(false);

  // Handle sidebar toggle with animation consideration
  const handleSidebarToggle = useCallback(() => {
    if (!reducedMotion) {
      setIsLoading(true);
      setTimeout(() => {
        setIsSidebarOpen(prev => !prev);
        setIsLoading(false);
      }, 150);
    } else {
      setIsSidebarOpen(prev => !prev);
    }
  }, [reducedMotion]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else if (!isMobile && !isSidebarOpen && isAuthenticated) {
      setIsSidebarOpen(true);
    }
  }, [isMobile, isAuthenticated, isSidebarOpen]);

  // Calculate content padding based on sidebar state
  const contentPadding = useCallback(() => {
    if (isMobile) return 16;
    if (isTablet) return 24;
    return isSidebarOpen ? SIDEBAR_WIDTH / GOLDEN_RATIO : 32;
  }, [isMobile, isTablet, isSidebarOpen]);

  return (
    <Box
      className={classNames(
        styles.layout,
        {
          [styles['layout--sidebar-open']]: isSidebarOpen,
          [styles['layout--mobile']]: isMobile,
          [styles['layout--loading']]: isLoading,
          [styles['layout--high-contrast']]: isHighContrast,
          [styles['layout--reduced-motion']]: reducedMotion
        },
        className
      )}
      data-theme={themeMode}
      data-reduced-motion={reducedMotion}
      role="application"
    >
      {/* Header Section */}
      <Header
        onMenuClick={handleSidebarToggle}
        isLoading={isLoading}
        className={styles.layout__header}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        className={styles.layout__main}
        role="main"
        aria-live="polite"
        sx={{
          marginLeft: isSidebarOpen && !isMobile ? `${SIDEBAR_WIDTH}px` : 0,
          transition: reducedMotion ? 'none' : 'margin-left 0.3s ease-in-out',
          padding: contentPadding()
        }}
      >
        {/* Navigation Sidebar */}
        {isAuthenticated && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            variant={isMobile ? 'temporary' : 'permanent'}
            className={styles.layout__sidebar}
          />
        )}

        {/* Content Container */}
        <Container
          maxWidth={false}
          className={styles.layout__content}
          sx={{
            maxWidth: `${LAYOUT_MAX_WIDTH}px`,
            transition: reducedMotion ? 'none' : 'all 0.3s ease-in-out'
          }}
        >
          {children}
        </Container>
      </Box>

      {/* Footer Section */}
      <Footer className={styles.layout__footer} />
    </Box>
  );
};

export default MainLayout;