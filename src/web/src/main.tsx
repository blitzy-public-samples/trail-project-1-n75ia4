/**
 * @fileoverview Application entry point implementing React 18 concurrent features,
 * Redux store provider, enhanced error boundaries, and performance monitoring.
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import ReactDOM from 'react-dom/client'; // v18.2.0
import { Provider } from 'react-redux'; // v8.1.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { PersistGate } from 'redux-persist/integration/react'; // v6.0.0

import App from './App';
import { store, persistor } from './redux/store';

// -----------------------------------------------------------------------------
// Performance Monitoring
// -----------------------------------------------------------------------------

/**
 * Initializes performance monitoring and reporting
 */
const initializePerformanceMonitoring = () => {
  // Report Web Vitals
  if ('reportWebVitals' in window) {
    // @ts-ignore - Web Vitals types
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }

  // Enable React Profiler in development
  if (process.env.NODE_ENV === 'development') {
    const { enableProfiler } = require('react-dom');
    enableProfiler();
  }
};

// -----------------------------------------------------------------------------
// Error Handling
// -----------------------------------------------------------------------------

/**
 * Global error boundary fallback component
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" className="error-boundary">
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Reload Application</button>
  </div>
);

/**
 * Error boundary event handler
 */
const handleError = (error: Error, info: { componentStack: string }) => {
  // Log error to monitoring service
  console.error('Application Error:', error);
  console.error('Component Stack:', info.componentStack);
};

// -----------------------------------------------------------------------------
// Root Render
// -----------------------------------------------------------------------------

/**
 * Renders the root application with React 18 concurrent features
 */
const renderApp = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Initialize performance monitoring
  initializePerformanceMonitoring();

  // Create React 18 concurrent root
  const root = ReactDOM.createRoot(rootElement);

  // Enable strict mode for development checks
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={handleError}
        onReset={() => window.location.reload()}
      >
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <App />
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// -----------------------------------------------------------------------------
// Development Tools
// -----------------------------------------------------------------------------

if (process.env.NODE_ENV === 'development') {
  // Enable React Developer Tools
  const { installDevTools } = require('react-devtools-core');
  installDevTools();

  // Enable Redux DevTools
  const { composeWithDevTools } = require('redux-devtools-extension');
  const { compose } = require('redux');
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = composeWithDevTools || compose;
}

// -----------------------------------------------------------------------------
// Initialize Application
// -----------------------------------------------------------------------------

// Handle browser compatibility
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.location.hostname !== 'localhost'
) {
  // Register service worker for PWA support
  navigator.serviceWorker.register('/service-worker.js');
}

// Initialize and render application
renderApp();

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}