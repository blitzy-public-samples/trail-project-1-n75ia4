/**
 * @fileoverview Authentication routes configuration implementing secure routing,
 * protected route wrappers, and enhanced security features with SSO support.
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Hooks and utilities
import { useAuth } from '../hooks/useAuth';

// Types
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

/**
 * Enhanced protected route wrapper with role-based access control
 * and security validation
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = []
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    userRole, 
    validateToken,
    securityMetrics 
  } = useAuth();

  // Validate authentication and permissions
  useEffect(() => {
    const validateAuth = async () => {
      if (isAuthenticated) {
        try {
          // Validate token on route change
          await validateToken();

          // Log security audit
          console.info('Route access audit:', {
            path: location.pathname,
            userRole,
            timestamp: new Date().toISOString(),
            metrics: securityMetrics
          });
        } catch (error) {
          console.error('Auth validation failed:', error);
        }
      }
    };

    validateAuth();
  }, [location.pathname, isAuthenticated, validateToken, userRole, securityMetrics]);

  // Check authentication
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return (
      <Navigate 
        to="/unauthorized" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  return <>{children}</>;
};

/**
 * Authentication routes configuration with enhanced security
 * and accessibility features
 */
const AuthRoutes: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Redirect authenticated users from auth pages
  const shouldRedirect = useCallback(() => {
    const authPaths = ['/login', '/register', '/forgot-password'];
    return isAuthenticated && authPaths.includes(location.pathname);
  }, [isAuthenticated, location.pathname]);

  if (shouldRedirect()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route 
        path="/login" 
        element={
          <Login />
        }
      />
      
      <Route 
        path="/register" 
        element={
          <Register />
        }
      />
      
      <Route 
        path="/forgot-password" 
        element={
          <ForgotPassword />
        }
      />
      
      <Route 
        path="/reset-password/:token" 
        element={
          <ResetPassword />
        }
      />

      {/* SSO Callback Routes */}
      <Route
        path="/auth/sso/callback"
        element={
          <ProtectedRoute>
            <div>Processing SSO login...</div>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={
          <Navigate 
            to={isAuthenticated ? '/dashboard' : '/login'} 
            replace 
          />
        }
      />
    </Routes>
  );
};

export default AuthRoutes;