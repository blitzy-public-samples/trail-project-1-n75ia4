/**
 * @fileoverview Forgot Password page component implementing secure password reset
 * functionality with comprehensive validation, rate limiting, and accessibility features.
 * Follows Material Design 3 principles and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';

import AuthLayout from '../../layouts/AuthLayout';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import { useNotification, NotificationType } from '../../hooks/useNotification';

// Security constants
const RATE_LIMIT_WINDOW = 300000; // 5 minutes
const MAX_ATTEMPTS = 5;

/**
 * Enhanced Forgot Password page component with comprehensive security
 * and accessibility features
 */
const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { t } = useTranslation();

  // Track rate limiting
  useEffect(() => {
    const attempts = parseInt(sessionStorage.getItem('forgotPasswordAttempts') || '0');
    const lastAttempt = parseInt(sessionStorage.getItem('forgotPasswordLastAttempt') || '0');
    const now = Date.now();

    // Reset attempts if window has expired
    if (now - lastAttempt > RATE_LIMIT_WINDOW) {
      sessionStorage.setItem('forgotPasswordAttempts', '0');
      sessionStorage.setItem('forgotPasswordLastAttempt', now.toString());
    }

    // Check if rate limited
    if (attempts >= MAX_ATTEMPTS) {
      showNotification({
        message: t('auth:errors.rateLimited'),
        type: NotificationType.ERROR,
        duration: 5000,
        ariaLive: 'assertive'
      });
      navigate('/login');
    }
  }, [navigate, showNotification, t]);

  /**
   * Handles successful password reset request
   */
  const handleSuccess = useCallback(async (email: string) => {
    // Show success notification with screen reader announcement
    showNotification({
      message: t('auth:forgotPassword.success'),
      type: NotificationType.SUCCESS,
      duration: 5000,
      ariaLive: 'polite'
    });

    // Log security audit event
    console.info('Password reset requested', {
      timestamp: new Date().toISOString(),
      email: email,
      eventType: 'PASSWORD_RESET_REQUESTED'
    });

    // Redirect to login after delay
    setTimeout(() => {
      navigate('/login');
    }, 3000);
  }, [navigate, showNotification, t]);

  /**
   * Handles form submission errors
   */
  const handleError = useCallback((error: Error) => {
    // Update rate limiting
    const attempts = parseInt(sessionStorage.getItem('forgotPasswordAttempts') || '0');
    sessionStorage.setItem('forgotPasswordAttempts', (attempts + 1).toString());
    sessionStorage.setItem('forgotPasswordLastAttempt', Date.now().toString());

    // Show error notification
    showNotification({
      message: error.message || t('auth:errors.generic'),
      type: NotificationType.ERROR,
      duration: 5000,
      ariaLive: 'assertive'
    });

    // Log error
    console.error('Password reset error', {
      timestamp: new Date().toISOString(),
      error: error.message,
      eventType: 'PASSWORD_RESET_ERROR'
    });
  }, [showNotification, t]);

  /**
   * Error boundary fallback
   */
  const ErrorFallback = useCallback(({ error, resetErrorBoundary }) => (
    <div role="alert">
      <h2>{t('common:errors.title')}</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>
        {t('common:errors.retry')}
      </button>
    </div>
  ), [t]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => navigate('/login')}
    >
      <AuthLayout
        title={t('auth:forgotPassword.title')}
        showFooter={true}
      >
        <div className="forgot-password-page">
          <div className="forgot-password-content">
            <p className="forgot-password-description">
              {t('auth:forgotPassword.description')}
            </p>

            <ForgotPasswordForm
              onSuccess={handleSuccess}
              onError={handleError}
              className="forgot-password-form"
            />

            <div className="forgot-password-links">
              <button
                onClick={() => navigate('/login')}
                className="text-button"
                aria-label={t('auth:forgotPassword.backToLogin')}
              >
                {t('auth:forgotPassword.backToLogin')}
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default ForgotPassword;