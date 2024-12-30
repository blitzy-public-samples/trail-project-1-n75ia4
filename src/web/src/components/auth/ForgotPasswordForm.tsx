/**
 * @fileoverview Secure and accessible forgot password form component implementing
 * comprehensive validation, rate limiting, and error handling for password reset.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash';
import { useForm } from '../../hooks/useForm';
import { forgotPasswordSchema } from '../../validators/auth.validator';
import { AuthService } from '../../services/auth.service';
import { Button, Input, ErrorMessage } from '../common';
import { showNotification, NotificationType } from '../../hooks/useNotification';

// Constants for rate limiting and security
const INITIAL_VALUES = { email: '' };
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 300000; // 5 minutes
const DEBOUNCE_DELAY_MS = 300;

// Component interfaces
interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  className?: string;
}

interface ForgotPasswordFormValues {
  email: string;
}

interface ForgotPasswordFormState {
  isLoading: boolean;
  error: string | null;
  isRateLimited: boolean;
  attempts: number;
}

/**
 * Forgot password form component with comprehensive security features
 * and accessibility support (WCAG 2.1 Level AA compliant)
 */
const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  className
}) => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<ForgotPasswordFormState>({
    isLoading: false,
    error: null,
    isRateLimited: false,
    attempts: 0
  });

  // Initialize form with validation schema
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isValid
  } = useForm<ForgotPasswordFormValues>({
    initialValues: INITIAL_VALUES,
    validationSchema: forgotPasswordSchema,
    onSubmit: handleFormSubmit
  });

  // Debounced email validation
  const debouncedValidateEmail = useCallback(
    debounce(async (email: string) => {
      try {
        await forgotPasswordSchema.validate({ email });
      } catch (error) {
        setFormState(prev => ({
          ...prev,
          error: error.message
        }));
      }
    }, DEBOUNCE_DELAY_MS),
    []
  );

  // Check rate limiting on mount
  useEffect(() => {
    const checkRateLimit = async () => {
      const isLimited = await AuthService.checkRateLimit('forgotPassword');
      setFormState(prev => ({
        ...prev,
        isRateLimited: isLimited
      }));
    };
    checkRateLimit();
  }, []);

  // Handle form submission with security checks
  async function handleFormSubmit(values: ForgotPasswordFormValues) {
    try {
      // Check rate limiting
      if (formState.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
        showNotification({
          message: 'Too many attempts. Please try again later.',
          type: NotificationType.ERROR
        });
        return;
      }

      setFormState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      // Call auth service with security headers
      await AuthService.forgotPassword(values.email);

      // Show success notification
      showNotification({
        message: 'Password reset instructions have been sent to your email',
        type: NotificationType.SUCCESS
      });

      // Reset form and call success callback
      onSuccess?.();
      navigate('/login');

    } catch (error) {
      setFormState(prev => ({
        ...prev,
        error: error.message,
        attempts: prev.attempts + 1,
        isRateLimited: prev.attempts + 1 >= RATE_LIMIT_MAX_ATTEMPTS
      }));

      showNotification({
        message: error.message,
        type: NotificationType.ERROR
      });
    } finally {
      setFormState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      noValidate
      aria-label="Forgot password form"
    >
      {/* Form title with ARIA support */}
      <h1 className="form-title" tabIndex={-1}>
        Reset Password
      </h1>

      {/* Email input with validation */}
      <Input
        id="email"
        name="email"
        type="email"
        label="Email Address"
        value={values.email}
        onChange={value => {
          handleChange({ target: { name: 'email', value } });
          debouncedValidateEmail(value);
        }}
        onBlur={handleBlur}
        error={touched.email ? errors.email : undefined}
        disabled={formState.isLoading || formState.isRateLimited}
        required
        autoComplete="email"
        aria-describedby="email-error"
      />

      {/* Error message display */}
      {formState.error && (
        <ErrorMessage
          id="form-error"
          message={formState.error}
          role="alert"
        />
      )}

      {/* Rate limit warning */}
      {formState.isRateLimited && (
        <div
          className="rate-limit-warning"
          role="alert"
          aria-live="polite"
        >
          Too many attempts. Please try again later.
        </div>
      )}

      {/* Submit button with loading state */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!isValid || formState.isLoading || formState.isRateLimited}
        loading={formState.isLoading}
        aria-busy={formState.isLoading}
      >
        {formState.isLoading ? 'Sending...' : 'Reset Password'}
      </Button>

      {/* Back to login link */}
      <Button
        variant="text"
        onClick={() => navigate('/login')}
        disabled={formState.isLoading}
      >
        Back to Login
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;