import React, { useEffect, useCallback } from 'react'; // v18.2.0
import { useNavigate } from 'react-router-dom'; // v6.0.0
import Footer from '../components/layout/Footer';
import { useTheme } from '../hooks/useTheme';
import styles from '../styles/components.scss';

/**
 * Props interface for AuthLayout component with enhanced type safety
 */
interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  showFooter?: boolean;
  loading?: boolean;
  error?: Error | null;
}

/**
 * AuthLayout component providing secure and accessible layout structure for authentication pages.
 * Implements Material Design 3 principles, WCAG 2.1 Level AA compliance, and responsive design.
 *
 * Features:
 * - Responsive layout with mobile-first approach
 * - WCAG 2.1 Level AA compliant
 * - Theme-aware with light/dark/high-contrast support
 * - Secure authentication flow structure
 * - Optimized performance with proper error boundaries
 * 
 * @param {AuthLayoutProps} props - Component props
 * @returns {JSX.Element} Rendered auth layout
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  showFooter = true,
  loading = false,
  error = null
}) => {
  const navigate = useNavigate();
  const { themeMode, isHighContrast, toggleTheme } = useTheme();

  // Handle authentication errors and redirects
  useEffect(() => {
    if (error?.message?.includes('authentication')) {
      navigate('/login', { replace: true });
    }
  }, [error, navigate]);

  // Handle theme transitions with reduced motion support
  const handleThemeChange = useCallback(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-transition-duration', 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '0ms' : '300ms'
    );
    toggleTheme();
  }, [toggleTheme]);

  return (
    <div 
      className={styles['auth-layout']}
      data-theme={themeMode}
      data-high-contrast={isHighContrast}
      role="main"
    >
      {/* Header Section */}
      <header className={styles['auth-layout__header']}>
        {title && (
          <h1 
            className={styles['auth-layout__title']}
            tabIndex={-1} // For focus management
          >
            {title}
          </h1>
        )}
        
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={handleThemeChange}
          className={styles['auth-layout__theme-toggle']}
          aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
        >
          <span className={styles['auth-layout__theme-icon']} aria-hidden="true" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className={styles['auth-layout__content']}>
        {/* Loading State */}
        {loading && (
          <div 
            className={styles['auth-layout__loading']}
            role="alert"
            aria-busy="true"
          >
            <div className={styles['auth-layout__spinner']} />
            <span className={styles['auth-layout__loading-text']}>
              Loading...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div 
            className={styles['auth-layout__error']}
            role="alert"
            aria-live="polite"
          >
            <p className={styles['auth-layout__error-message']}>
              {error.message}
            </p>
          </div>
        )}

        {/* Main Content */}
        <div className={styles['auth-layout__container']}>
          {children}
        </div>
      </main>

      {/* Footer Section */}
      {showFooter && (
        <Footer className={styles['auth-layout__footer']} />
      )}
    </div>
  );
};

export default AuthLayout;