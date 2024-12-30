/**
 * @fileoverview Root application component implementing Material Design 3 principles
 * with comprehensive error handling, analytics, and accessibility features.
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux'; // v8.1.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import AppRoutes from './routes';
import { useTheme } from './hooks/useTheme';
import { store } from './redux/store';
import { NotificationContainer } from './components/common/Notification';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// -----------------------------------------------------------------------------
// Error Fallback Component
// -----------------------------------------------------------------------------

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => (
  <div 
    role="alert"
    className="error-boundary"
    aria-live="assertive"
  >
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button 
      onClick={resetErrorBoundary}
      className="error-boundary__retry-button"
    >
      Try Again
    </button>
  </div>
);

// -----------------------------------------------------------------------------
// Root Application Component
// -----------------------------------------------------------------------------

/**
 * Root application component that sets up the core application infrastructure
 * including state management, routing, error handling, and accessibility features.
 */
const App: React.FC = () => {
  const { themeMode, colorScheme, isHighContrast } = useTheme();

  // Set up theme-related document attributes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-color-scheme', colorScheme);
    root.setAttribute('data-high-contrast', isHighContrast.toString());
  }, [themeMode, colorScheme, isHighContrast]);

  // Set up accessibility monitoring
  useEffect(() => {
    // Create ARIA live region for dynamic announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    return () => {
      document.body.removeChild(liveRegion);
    };
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        // Log error to monitoring service
        console.error('Application Error:', error);
      }}
      onReset={() => {
        // Reset application state on error recovery
        window.location.reload();
      }}
    >
      <Provider store={store}>
        <div 
          className="app"
          data-theme={themeMode}
          data-color-scheme={colorScheme}
          data-high-contrast={isHighContrast}
        >
          {/* Main Application Routes */}
          <AppRoutes />

          {/* Global Notification System */}
          <NotificationContainer />

          {/* Skip to main content link for keyboard users */}
          <a 
            href="#main-content" 
            className="skip-link"
            tabIndex={0}
          >
            Skip to main content
          </a>
        </div>
      </Provider>
    </ErrorBoundary>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = `
.app {
  min-height: 100vh;
  background-color: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
  transition: background-color var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
}

.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-lg);
  text-align: center;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.error-boundary__retry-button {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  cursor: pointer;
  transition: background-color var(--md-sys-motion-duration-short) var(--md-sys-motion-easing-standard);
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: var(--spacing-sm);
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  transition: top var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
  z-index: var(--md-sys-zindex-skiplink);
}

.skip-link:focus {
  top: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app,
  .error-boundary__retry-button,
  .skip-link {
    transition: none;
  }
}
`;

export default App;