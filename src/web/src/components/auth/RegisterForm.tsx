/**
 * @fileoverview A comprehensive registration form component implementing Material Design 3
 * principles with enhanced security, accessibility, and validation features.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslation } from 'react-i18next';

import Input from '../common/Input';
import Button from '../common/Button';
import { registerSchema } from '../../validators/auth.validator';
import { validatePasswordComplexity } from '../../utils/validation.utils';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  loading?: boolean;
  initialValues?: Partial<RegisterFormData>;
  onValidationError?: (errors: ValidationError[]) => void;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
  gdprConsent: boolean;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  loading = false,
  initialValues = {},
  onValidationError
}) => {
  // Hooks
  const { t } = useTranslation('auth');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: '#9E9E9E'
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields },
    setError,
    clearErrors
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: initialValues,
    mode: 'onChange'
  });

  // Watch password field for strength indicator
  const watchPassword = watch('password');

  // Update password strength indicator
  useEffect(() => {
    if (watchPassword) {
      const result = validatePasswordComplexity(watchPassword);
      const strengthColor = getStrengthColor(result.score || 0);
      setPasswordStrength({
        score: result.score || 0,
        feedback: result.suggestions || [],
        color: strengthColor
      });
    }
  }, [watchPassword]);

  // Handle form submission
  const handleFormSubmit = useCallback(async (data: RegisterFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      if (error instanceof Error) {
        setError('root', {
          type: 'submit',
          message: error.message
        });
        onValidationError?.([{ field: 'root', message: error.message }]);
      }
    }
  }, [onSubmit, setError, onValidationError]);

  // Get strength color based on score
  const getStrengthColor = (score: number): string => {
    switch (true) {
      case score >= 80:
        return '#4CAF50'; // Strong
      case score >= 60:
        return '#FFC107'; // Medium
      case score >= 30:
        return '#FF9800'; // Weak
      default:
        return '#F44336'; // Very Weak
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="register-form"
      noValidate
      aria-label={t('register.form.aria-label')}
    >
      {/* Name Input */}
      <Input
        id="name"
        type="text"
        label={t('register.form.name.label')}
        error={errors.name?.message}
        disabled={loading}
        required
        {...register('name')}
        aria-describedby={errors.name ? 'name-error' : undefined}
        data-testid="register-name-input"
      />

      {/* Email Input */}
      <Input
        id="email"
        type="email"
        label={t('register.form.email.label')}
        error={errors.email?.message}
        disabled={loading}
        required
        autoComplete="email"
        {...register('email')}
        aria-describedby={errors.email ? 'email-error' : undefined}
        data-testid="register-email-input"
      />

      {/* Password Input */}
      <Input
        id="password"
        type="password"
        label={t('register.form.password.label')}
        error={errors.password?.message}
        disabled={loading}
        required
        autoComplete="new-password"
        {...register('password')}
        aria-describedby={`password-strength ${errors.password ? 'password-error' : ''}`}
        data-testid="register-password-input"
      />

      {/* Password Strength Indicator */}
      {touchedFields.password && (
        <div
          id="password-strength"
          className="password-strength"
          role="status"
          aria-live="polite"
        >
          <div
            className="strength-bar"
            style={{
              width: `${passwordStrength.score}%`,
              backgroundColor: passwordStrength.color,
              transition: 'width 0.3s ease-in-out'
            }}
          />
          <div className="strength-feedback">
            {passwordStrength.feedback.map((feedback, index) => (
              <p key={index} className="feedback-item">
                {feedback}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Password Input */}
      <Input
        id="confirmPassword"
        type="password"
        label={t('register.form.confirmPassword.label')}
        error={errors.confirmPassword?.message}
        disabled={loading}
        required
        autoComplete="new-password"
        {...register('confirmPassword')}
        aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
        data-testid="register-confirm-password-input"
      />

      {/* Terms Acceptance Checkbox */}
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            disabled={loading}
            aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
            data-testid="register-terms-checkbox"
          />
          <span>{t('register.form.terms.label')}</span>
        </label>
        {errors.acceptTerms && (
          <span id="terms-error" className="error-message" role="alert">
            {errors.acceptTerms.message}
          </span>
        )}
      </div>

      {/* GDPR Consent Checkbox */}
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            {...register('gdprConsent')}
            disabled={loading}
            aria-describedby={errors.gdprConsent ? 'gdpr-error' : undefined}
            data-testid="register-gdpr-checkbox"
          />
          <span>{t('register.form.gdpr.label')}</span>
        </label>
        {errors.gdprConsent && (
          <span id="gdpr-error" className="error-message" role="alert">
            {errors.gdprConsent.message}
          </span>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={loading || isSubmitting}
        loading={loading || isSubmitting}
        data-testid="register-submit-button"
      >
        {t('register.form.submit')}
      </Button>

      {/* General Error Message */}
      {errors.root && (
        <div className="error-message" role="alert">
          {errors.root.message}
        </div>
      )}
    </form>
  );
};

export default RegisterForm;