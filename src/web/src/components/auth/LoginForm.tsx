/**
 * @fileoverview Secure and accessible login form component implementing Material Design 3
 * principles with comprehensive validation, error handling, and SSO integration.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, memo } from 'react'; // v18.2.0
import { useForm } from 'react-hook-form'; // v7.0.0
import { yupResolver } from '@hookform/resolvers/yup'; // v3.0.0
import debounce from 'lodash/debounce'; // v4.17.21

import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';
import { loginSchema } from '../../validators/auth.validator';
import styles from './login-form.module.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface LoginFormProps {
  /** Callback for successful authentication */
  onSuccess: (tokens: AuthTokens) => void;
  /** Callback for authentication errors */
  onError: (error: Error) => void;
  /** Whether SSO authentication is enabled */
  ssoEnabled?: boolean;
  /** Maximum login attempts before lockout */
  maxAttempts?: number;
}

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const LoginForm = memo<LoginFormProps>(({
  onSuccess,
  onError,
  ssoEnabled = false,
  maxAttempts = 3
}) => {
  // State and hooks
  const { login, loading, error: authError } = useAuth();
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  // Form initialization with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
    setError,
    clearErrors,
    watch
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Watch form values for real-time validation
  const formValues = watch();

  // Debounced validation handler
  const debouncedValidate = useCallback(
    debounce((value: string, field: keyof LoginFormData) => {
      clearErrors(field);
      loginSchema.validateAt(field, { [field]: value }).catch(error => {
        setError(field, { type: 'validation', message: error.message });
      });
    }, 300),
    []
  );

  // Effect to handle lockout state
  useEffect(() => {
    if (isLocked && lockoutEndTime) {
      const timer = setTimeout(() => {
        setIsLocked(false);
        setLockoutEndTime(null);
        setAttempts(0);
      }, lockoutEndTime - Date.now());

      return () => clearTimeout(timer);
    }
  }, [isLocked, lockoutEndTime]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    try {
      if (isLocked) return;

      // Increment attempt counter
      const currentAttempts = attempts + 1;
      setAttempts(currentAttempts);

      // Check for max attempts
      if (currentAttempts >= maxAttempts) {
        const lockoutDuration = 15 * 60 * 1000; // 15 minutes
        setIsLocked(true);
        setLockoutEndTime(Date.now() + lockoutDuration);
        setError('email', {
          type: 'locked',
          message: `Account locked. Please try again in 15 minutes.`
        });
        return;
      }

      // Attempt login
      const tokens = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe
      });

      // Handle success
      onSuccess(tokens);
      setAttempts(0);
    } catch (error) {
      onError(error as Error);
    }
  };

  // Handle SSO authentication
  const handleSSOLogin = async () => {
    try {
      // SSO login implementation would go here
      const tokens = await login({ provider: 'SSO' });
      onSuccess(tokens);
    } catch (error) {
      onError(error as Error);
    }
  };

  return (
    <form
      className={styles['login-form']}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="login-title"
    >
      <h1 id="login-title" className={styles['login-form__title']}>
        Sign In
      </h1>

      {/* Email Input */}
      <div className={styles['login-form__input-group']}>
        <Input
          id="email"
          type="email"
          label="Email Address"
          error={errors.email?.message}
          disabled={isLocked || loading}
          required
          {...register('email', {
            onChange: (e) => debouncedValidate(e.target.value, 'email')
          })}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
      </div>

      {/* Password Input */}
      <div className={styles['login-form__input-group']}>
        <Input
          id="password"
          type="password"
          label="Password"
          error={errors.password?.message}
          disabled={isLocked || loading}
          required
          {...register('password', {
            onChange: (e) => debouncedValidate(e.target.value, 'password')
          })}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
      </div>

      {/* Remember Me Checkbox */}
      <div className={styles['login-form__checkbox']}>
        <input
          type="checkbox"
          id="rememberMe"
          {...register('rememberMe')}
          disabled={isLocked || loading}
        />
        <label htmlFor="rememberMe">Remember me</label>
      </div>

      {/* Error Message */}
      {authError && (
        <div
          className={styles['login-form__error']}
          role="alert"
          aria-live="polite"
        >
          {authError}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!isValid || isSubmitting || isLocked || loading}
        loading={loading}
        aria-disabled={!isValid || isSubmitting || isLocked || loading}
      >
        Sign In
      </Button>

      {/* SSO Button */}
      {ssoEnabled && (
        <Button
          type="button"
          variant="outlined"
          fullWidth
          onClick={handleSSOLogin}
          disabled={isLocked || loading}
          className={styles['login-form__sso-button']}
        >
          Sign in with SSO
        </Button>
      )}

      {/* Lockout Message */}
      {isLocked && lockoutEndTime && (
        <div
          className={styles['login-form__lockout']}
          role="alert"
          aria-live="assertive"
        >
          Account locked. Please try again in{' '}
          {Math.ceil((lockoutEndTime - Date.now()) / 60000)} minutes.
        </div>
      )}
    </form>
  );
});

LoginForm.displayName = 'LoginForm';

export default LoginForm;