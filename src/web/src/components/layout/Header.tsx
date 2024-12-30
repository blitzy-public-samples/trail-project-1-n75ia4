/**
 * @fileoverview Enterprise-grade header component implementing Material Design 3 specifications,
 * responsive design, accessibility features, and comprehensive user interaction handling.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import classNames from 'classnames'; // v2.3.2
import { useMediaQuery } from '@mui/material'; // v5.0.0
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import { ThemeProvider } from '@mui/material'; // v5.0.0
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Notification from '../common/Notification';
import { useAuth } from '../../hooks/useAuth';
import styles from './Header.module.scss';

// Animation variants for menu and notifications
const menuVariants = {
  open: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  closed: { opacity: 0, x: '-100%', transition: { duration: 0.2 } }
};

const notificationVariants = {
  open: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  closed: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

interface HeaderProps {
  /** Handler for mobile menu toggle */
  onMenuClick: () => void;
  /** Handler for theme mode toggle */
  onThemeToggle: () => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Loading state for async operations */
  isLoading?: boolean;
  /** Error boundary component */
  errorBoundary?: React.ComponentType;
}

/**
 * Enterprise-grade header component with comprehensive feature set
 */
const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onThemeToggle,
  className,
  isLoading = false,
  errorBoundary: ErrorBoundary
}) => {
  // Hooks and state
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle menu toggle with animation
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev);
    onMenuClick();
  }, [onMenuClick]);

  // Handle notifications toggle with animation
  const handleNotificationsToggle = useCallback(() => {
    setIsNotificationsOpen(prev => !prev);
  }, []);

  // Handle theme toggle with persistence
  const handleThemeToggle = useCallback(() => {
    onThemeToggle();
  }, [onThemeToggle]);

  // Handle logout with confirmation
  const handleLogout = useCallback(async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  }, [logout]);

  // Render header content based on screen size
  const renderHeaderContent = () => (
    <div className={styles.header__container}>
      {/* Logo and Menu Button */}
      <div className={styles.header__left}>
        {isMobile && (
          <Button
            variant="text"
            onClick={handleMenuToggle}
            ariaLabel="Toggle menu"
            className={styles.header__menuButton}
          >
            <span className={styles.header__menuIcon} aria-hidden="true">
              {isMenuOpen ? '×' : '☰'}
            </span>
          </Button>
        )}
        <motion.div
          className={styles.header__logo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Task Master
        </motion.div>
      </div>

      {/* Navigation and Actions */}
      <div className={styles.header__right}>
        {!isMobile && (
          <nav className={styles.header__nav} role="navigation">
            <Button variant="text" href="/dashboard">Dashboard</Button>
            <Button variant="text" href="/projects">Projects</Button>
            <Button variant="text" href="/tasks">Tasks</Button>
          </nav>
        )}

        {/* Action Buttons */}
        <div className={styles.header__actions}>
          <Button
            variant="text"
            onClick={handleThemeToggle}
            ariaLabel="Toggle theme"
            className={styles.header__themeToggle}
          >
            {/* Theme icon */}
            <span aria-hidden="true">🌓</span>
          </Button>

          <Button
            variant="text"
            onClick={handleNotificationsToggle}
            ariaLabel="Toggle notifications"
            className={styles.header__notifications}
          >
            {/* Notification icon */}
            <span aria-hidden="true">🔔</span>
          </Button>

          {/* User Profile */}
          {user && (
            <div className={styles.header__profile}>
              <Avatar
                user={user}
                size="small"
                className={styles.header__avatar}
                alt={`${user.name}'s profile`}
              />
              {!isTablet && (
                <span className={styles.header__userName}>{user.name}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <ThemeProvider theme={{}}>
      <header
        className={classNames(
          styles.header,
          {
            [styles['header--mobile']]: isMobile,
            [styles['header--loading']]: isLoading,
          },
          className
        )}
        role="banner"
      >
        {ErrorBoundary ? (
          <ErrorBoundary>{renderHeaderContent()}</ErrorBoundary>
        ) : (
          renderHeaderContent()
        )}

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && isMobile && (
            <motion.nav
              className={styles.header__mobileMenu}
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              role="navigation"
            >
              <Button variant="text" href="/dashboard" fullWidth>Dashboard</Button>
              <Button variant="text" href="/projects" fullWidth>Projects</Button>
              <Button variant="text" href="/tasks" fullWidth>Tasks</Button>
              <Button variant="outlined" onClick={handleLogout} fullWidth>Logout</Button>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* Notifications Panel */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <motion.div
              className={styles.header__notificationsPanel}
              variants={notificationVariants}
              initial="closed"
              animate="open"
              exit="closed"
              role="complementary"
              aria-label="Notifications"
            >
              <Notification
                id="notification-1"
                message="Welcome to Task Master!"
                type="info"
                duration={0}
                position="top-right"
                dismissible={true}
                stackIndex={0}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </ThemeProvider>
  );
};

export default Header;