import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { resetPasswordSchema } from '../../validators/auth.validator';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface ResetPasswordFormProps {
  /** Reset token from URL */
  token: string;
  /** Success callback */
  onSuccess: () => void;
  /** Error callback */
  onError: (error: string) => void;
  /** Enable MFA verification */
  enableMFA?: boolean;
}

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  mfaCode?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccess,
  onError,
  enableMFA = false
}) => {
  // State
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const lastAttemptRef = useRef<number>(0);

  // Hooks
  const { resetPassword, validateResetToken } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    clearErrors
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onChange'
  });

  // Refs for accessibility
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    const validateToken = async () => {
      try {
        const isValid = await validateResetToken(token);
        setIsValidToken(isValid);
        if (!isValid) {
          onError('Invalid or expired reset token');
        }
      } catch (error) {
        setIsValidToken(false);
        onError('Failed to validate reset token');
      }
    };

    validateToken();
  }, [token, onError, validateResetToken]);

  useEffect(() => {
    // Focus password input on mount for accessibility
    passwordInputRef.current?.focus();
  }, []);

  // Password strength monitoring
  useEffect(() => {
    const password = watch('password');
    if (password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    }
  }, [watch]);

  // Rate limiting check
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptRef.current;
    
    if (attempts >= 5 && timeSinceLastAttempt < 900000) { // 15 minutes lockout
      return false;
    }
    
    if (timeSinceLastAttempt < 1000) { // 1 second between attempts
      return false;
    }
    
    return true;
  };

  // Form submission handler
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      if (!isValidToken) {
        onError('Invalid reset token');
        return;
      }

      if (!checkRateLimit()) {
        onError('Too many attempts. Please try again later.');
        return;
      }

      setIsSubmitting(true);
      lastAttemptRef.current = Date.now();
      setAttempts(prev => prev + 1);

      await resetPassword({
        token,
        password: data.password,
        mfaCode: data.mfaCode
      });

      onSuccess();
    } catch (error) {
      setError('root', {
        message: error.message || 'Failed to reset password'
      });
      onError(error.message || 'Failed to reset password');
      
      // Announce error to screen readers
      errorMessageRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isValidToken) {
    return (
      <div role="alert" className="error-message" ref={errorMessageRef}>
        Invalid or expired reset token. Please request a new password reset.
      </div>
    );
  }

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)}
      className="form-layout"
      noValidate
      aria-label="Reset password form"
    >
      {/* Password Field */}
      <div className="form-field">
        <label htmlFor="password" className="form-label">
          New Password
        </label>
        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            className={`form-input ${errors.password ? 'error' : ''}`}
            ref={passwordInputRef}
            aria-invalid={!!errors.password}
            aria-describedby="password-error password-requirements"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && (
          <div id="password-error" role="alert" className="error-message">
            {errors.password.message}
          </div>
        )}
        <div id="password-requirements" className="password-requirements">
          Password must be at least 12 characters and include uppercase, lowercase, 
          number, and special character
        </div>
        <div 
          className="password-strength" 
          role="progressbar" 
          aria-valuenow={passwordStrength} 
          aria-valuemin={0} 
          aria-valuemax={100}
        >
          <div 
            className="strength-indicator" 
            style={{ width: `${passwordStrength}%` }} 
          />
        </div>
      </div>

      {/* Confirm Password Field */}
      <div className="form-field">
        <label htmlFor="confirmPassword" className="form-label">
          Confirm Password
        </label>
        <div className="password-input-wrapper">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby="confirm-password-error"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="password-toggle"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.confirmPassword && (
          <div id="confirm-password-error" role="alert" className="error-message">
            {errors.confirmPassword.message}
          </div>
        )}
      </div>

      {/* MFA Field */}
      {enableMFA && (
        <div className="form-field">
          <label htmlFor="mfaCode" className="form-label">
            MFA Code
          </label>
          <input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            {...register('mfaCode')}
            className={`form-input ${errors.mfaCode ? 'error' : ''}`}
            aria-invalid={!!errors.mfaCode}
            aria-describedby="mfa-error"
          />
          {errors.mfaCode && (
            <div id="mfa-error" role="alert" className="error-message">
              {errors.mfaCode.message}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isSubmitting}
        loading={isSubmitting}
        aria-label="Reset password"
      >
        Reset Password
      </Button>

      {/* General Error Message */}
      {errors.root && (
        <div 
          role="alert" 
          className="error-message" 
          ref={errorMessageRef}
          tabIndex={-1}
        >
          {errors.root.message}
        </div>
      )}
    </form>
  );
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  
  // Length check
  if (password.length >= 12) strength += 25;
  
  // Character type checks
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 10;
  
  return Math.min(strength, 100);
};

export default ResetPasswordForm;