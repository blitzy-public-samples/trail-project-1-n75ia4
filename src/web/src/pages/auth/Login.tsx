/**
 * @fileoverview Enterprise-grade login page component implementing secure authentication flow
 * with Material Design 3, advanced security monitoring, SSO integration, and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErrorBoundary } from '@sentry/react';

import AuthLayout from '../../layouts/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../hooks/useAuth';
import { useNotification, NotificationType } from '../../hooks/useNotification';
import { validateLoginCredentials } from '../../validators/auth.validator';
import { AuthTokens, ValidationMetadata } from '../../types/auth.types';
import styles from './login.module.scss';

/**
 * Enhanced login page component with comprehensive security features and accessibility
 * Implements WCAG 2.1 Level AA compliance and Material Design 3 principles
 */
const Login: React.FC = () => {
  // Core hooks
  const navigate = useNavigate();
  const { showBoundary } = useErrorBoundary();
  const { showNotification } = useNotification();
  const { 
    isAuthenticated, 
    login, 
    securityMetrics 
  } = useAuth();

  // Security metadata for validation
  const validationMetadata = useMemo<ValidationMetadata>(() => ({
    attemptCount: securityMetrics?.loginAttempts || 0,
    lastAttempt: securityMetrics?.lastFailedAttempt || 0,
    deviceId: window.localStorage.getItem('deviceId') || crypto.randomUUID()
  }), [securityMetrics]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handles successful login with enhanced security checks
   * @param tokens - Authentication tokens
   */
  const handleLoginSuccess = useCallback(async (tokens: AuthTokens) => {
    try {
      // Security validation and monitoring
      const securityContext = {
        timestamp: Date.now(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        geoLocation: await fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .catch(() => null)
      };

      // Log successful authentication
      console.info('Authentication successful', {
        timestamp: securityContext.timestamp,
        deviceInfo: securityContext.deviceInfo
      });

      showNotification({
        message: 'Successfully logged in',
        type: NotificationType.SUCCESS,
        duration: 3000
      });

      // Navigate to dashboard with security context
      navigate('/dashboard', { 
        replace: true,
        state: { securityContext }
      });
    } catch (error) {
      showBoundary(error);
    }
  }, [navigate, showNotification, showBoundary]);

  /**
   * Handles login errors with comprehensive error tracking
   * @param error - Authentication error
   */
  const handleLoginError = useCallback((error: Error) => {
    // Log error with security context
    console.error('Authentication failed', {
      timestamp: Date.now(),
      error: error.message,
      metadata: validationMetadata
    });

    showNotification({
      message: error.message || 'Authentication failed. Please try again.',
      type: NotificationType.ERROR,
      duration: 5000,
      ariaLive: 'assertive'
    });
  }, [validationMetadata, showNotification]);

  /**
   * Handles form submission with enhanced validation
   * @param credentials - Login credentials
   */
  const handleSubmit = useCallback(async (credentials: any) => {
    try {
      // Validate credentials with rate limiting
      const validationResult = await validateLoginCredentials(
        credentials,
        validationMetadata
      );

      if (!validationResult.isValid) {
        throw new Error(validationResult.errorMessage);
      }

      // Attempt login
      const tokens = await login(credentials);
      await handleLoginSuccess(tokens);
    } catch (error) {
      handleLoginError(error as Error);
    }
  }, [login, handleLoginSuccess, handleLoginError, validationMetadata]);

  return (
    <AuthLayout
      title="Sign In"
      showFooter={true}
      className={styles.loginPage}
    >
      <div className={styles.loginContainer}>
        <h1 className={styles.loginTitle}>
          Welcome Back
        </h1>
        
        <p className={styles.loginSubtitle}>
          Sign in to access your account
        </p>

        <LoginForm
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          onSubmit={handleSubmit}
          ssoEnabled={true}
          maxAttempts={3}
        />

        <div className={styles.loginLinks}>
          <a 
            href="/forgot-password"
            className={styles.forgotPassword}
            aria-label="Reset your password"
          >
            Forgot password?
          </a>
          <a 
            href="/register"
            className={styles.register}
            aria-label="Create a new account"
          >
            Create account
          </a>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;