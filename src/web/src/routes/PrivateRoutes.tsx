/**
 * @fileoverview Protected routes component implementing secure route protection with
 * role-based access control, lazy loading, and comprehensive security features.
 * @version 1.0.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../layouts/DashboardLayout';

// Lazy loaded components with retry mechanism
const retryLoadComponent = (componentImport: () => Promise<any>, retries = 3, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        setTimeout(() => {
          retryLoadComponent(componentImport, retries - 1, timeout).then(resolve, reject);
        }, timeout);
      });
  });
};

// Lazy load route components with retry mechanism
const Dashboard = lazy(() => retryLoadComponent(() => import('../pages/dashboard/Dashboard')));
const ProjectRoutes = lazy(() => retryLoadComponent(() => import('../pages/project/ProjectRoutes')));
const TaskRoutes = lazy(() => retryLoadComponent(() => import('../pages/task/TaskRoutes')));
const SettingsRoutes = lazy(() => retryLoadComponent(() => import('../pages/settings/SettingsRoutes')));

// Loading fallback component
const LoadingFallback = () => (
  <div role="progressbar" aria-label="Loading page content">
    Loading...
  </div>
);

/**
 * Higher-order component for role-based route protection
 */
const RequireAuth: React.FC<{
  allowedRoles: string[];
  requiresVerification?: boolean;
  children: React.ReactNode;
}> = ({ allowedRoles, requiresVerification = false, children }) => {
  const { isAuthenticated, user, validateToken } = useAuth();
  const location = useLocation();

  // Validate authentication and token on route access
  useEffect(() => {
    if (isAuthenticated) {
      validateToken().catch(() => {
        // Token validation failed, will redirect to login
      });
    }
  }, [isAuthenticated, validateToken, location.pathname]);

  if (!isAuthenticated) {
    // Preserve attempted location for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // User lacks required role, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresVerification && !user.isVerified) {
    // User needs verification, redirect to verification page
    return <Navigate to="/verify" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Protected routes component with enhanced security and accessibility features
 */
const PrivateRoutes: React.FC = () => {
  const location = useLocation();

  // Announce route changes for screen readers
  useEffect(() => {
    const message = `Navigated to ${location.pathname.replace('/', ' ')}`;
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    document.body.appendChild(announcer);

    return () => {
      document.body.removeChild(announcer);
    };
  }, [location]);

  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Dashboard Route */}
          <Route
            path="/"
            element={
              <RequireAuth allowedRoles={['admin', 'project_manager', 'team_lead', 'team_member']}>
                <Dashboard />
              </RequireAuth>
            }
          />

          {/* Project Routes */}
          <Route
            path="/projects/*"
            element={
              <RequireAuth
                allowedRoles={['admin', 'project_manager', 'team_lead', 'team_member']}
                requiresVerification={true}
              >
                <ProjectRoutes />
              </RequireAuth>
            }
          />

          {/* Task Routes */}
          <Route
            path="/tasks/*"
            element={
              <RequireAuth
                allowedRoles={['admin', 'project_manager', 'team_lead', 'team_member']}
                requiresVerification={true}
              >
                <TaskRoutes />
              </RequireAuth>
            }
          />

          {/* Settings Routes - Admin Only */}
          <Route
            path="/settings/*"
            element={
              <RequireAuth allowedRoles={['admin']} requiresVerification={true}>
                <SettingsRoutes />
              </RequireAuth>
            }
          />

          {/* Fallback route for unmatched paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
};

export default PrivateRoutes;