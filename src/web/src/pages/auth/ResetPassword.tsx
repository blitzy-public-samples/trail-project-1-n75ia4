import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material'; // v5.0.0
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';

/**
 * ResetPassword page component implementing secure password reset functionality
 * with comprehensive validation, accessibility features, and user feedback.
 * 
 * Features:
 * - WCAG 2.1 Level AA compliant
 * - Secure token validation
 * - Comprehensive error handling
 * - Mobile-first responsive design
 * - Real-time password strength validation
 */
const ResetPassword: React.FC = () => {
  // Hooks
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, validateResetToken } = useAuth();
  const { showNotification } = useNotification();

  // State
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect authenticated users
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Validate reset token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Reset token is missing');
        setIsValidatingToken(false);
        return;
      }

      try {
        const isValid = await validateResetToken(token);
        setIsTokenValid(isValid);
        if (!isValid) {
          setError('Invalid or expired reset token');
        }
      } catch (err) {
        setError('Failed to validate reset token');
        console.error('Token validation error:', err);
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [token, validateResetToken]);

  // Handle successful password reset
  const handleResetSuccess = () => {
    showNotification({
      message: 'Password has been successfully reset. Please log in with your new password.',
      type: 'success',
      duration: 6000
    });
    navigate('/login', { replace: true });
  };

  // Handle reset error
  const handleResetError = (errorMessage: string) => {
    setError(errorMessage);
    showNotification({
      message: errorMessage,
      type: 'error',
      duration: 6000,
      ariaLive: 'assertive'
    });
  };

  return (
    <AuthLayout
      title="Reset Password"
      error={error ? new Error(error) : null}
    >
      <div 
        className="reset-password-container"
        role="main"
        aria-labelledby="reset-password-title"
      >
        <h1 
          id="reset-password-title" 
          className="visually-hidden"
        >
          Reset Password
        </h1>

        {isValidatingToken ? (
          <div 
            className="loading-container"
            role="status"
            aria-label="Validating reset token"
          >
            <CircularProgress 
              size={40}
              aria-hidden="true"
            />
            <span className="visually-hidden">
              Validating reset token...
            </span>
          </div>
        ) : isTokenValid ? (
          <ResetPasswordForm
            token={token!}
            onSuccess={handleResetSuccess}
            onError={handleResetError}
            enableMFA={false} // Enable if MFA is required for password reset
          />
        ) : (
          <div 
            className="error-container"
            role="alert"
          >
            <p className="error-message">
              {error || 'Invalid reset token'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="request-new-link-button"
              aria-label="Request new password reset link"
            >
              Request New Reset Link
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;