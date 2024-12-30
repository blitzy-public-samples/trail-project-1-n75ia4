/**
 * @fileoverview Root routing configuration component that orchestrates the application's
 * routing structure with comprehensive security, accessibility, and performance features.
 * @version 1.0.0
 */

import React, { Suspense, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useMetrics } from '@monitoring/metrics';

// Route components
import AuthRoutes from './AuthRoutes';
import PrivateRoutes from './PrivateRoutes';
import PublicRoutes from './PublicRoutes';

// Hooks
import { useAuth } from '../hooks/useAuth';

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div 
    role="progressbar" 
    className="loading-fallback"
    aria-label="Loading application content"
  >
    <div className="loading-spinner" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

/**
 * Route change announcer for screen readers
 */
const RouteAnnouncer: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const message = `Navigated to ${location.pathname.replace('/', ' ')}`;
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    document.body.appendChild(announcer);

    return () => {
      document.body.removeChild(announcer);
    };
  }, [location]);

  return null;
};

/**
 * Root routing component implementing secure routing with comprehensive
 * security features and accessibility support
 */
const AppRoutes: React.FC = () => {
  const { isAuthenticated, validateSession } = useAuth();
  const metrics = useMetrics();

  // Validate session on route changes
  useEffect(() => {
    if (isAuthenticated) {
      validateSession().catch(() => {
        // Session validation failed, will redirect to login
      });
    }
  }, [isAuthenticated, validateSession]);

  // Track route performance metrics
  const handleRouteChange = useCallback((location: string) => {
    metrics.trackPageView({
      path: location,
      timestamp: Date.now()
    });
  }, [metrics]);

  return (
    <BrowserRouter>
      <RouteAnnouncer />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={<PublicRoutes />} 
          />

          {/* Authentication Routes */}
          <Route 
            path="/auth/*" 
            element={<AuthRoutes />} 
          />

          {/* Protected Application Routes */}
          <Route
            path="/app/*"
            element={
              isAuthenticated ? (
                <PrivateRoutes />
              ) : (
                <Navigate 
                  to="/auth/login" 
                  replace 
                  state={{ from: location.pathname }}
                />
              )
            }
          />

          {/* Error Routes */}
          <Route 
            path="/404" 
            element={<Navigate to="/app/404" replace />} 
          />
          <Route 
            path="/500" 
            element={<Navigate to="/app/500" replace />} 
          />

          {/* Catch-all Route */}
          <Route 
            path="*" 
            element={<Navigate to="/404" replace />} 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

// For debugging and testing
AppRoutes.displayName = 'AppRoutes';

export default AppRoutes;