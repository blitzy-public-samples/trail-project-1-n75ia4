/**
 * @fileoverview Registration page component implementing secure user registration
 * with comprehensive form validation, accessibility features, and Material Design 3
 * principles.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { validatePasswordComplexity } from '../../utils/validation.utils';

// Constants for security measures
const MAX_REGISTRATION_ATTEMPTS = 3;
const REGISTRATION_COOLDOWN = 15 * 60 * 1000; // 15 minutes

/**
 * Registration page component with enhanced security and accessibility features
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const { showNotification } = useNotification();
  
  // Security tracking state
  const [registrationAttempts, setRegistrationAttempts] = useState<number>(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  /**
   * Generate device fingerprint for security tracking
   */
  useEffect(() => {
    const generateFingerprint = async () => {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency,
        screen.width,
        screen.height
      ].join('|');

      const encoder = new TextEncoder();
      const data = encoder.encode(components);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setDeviceFingerprint(fingerprint);
    };

    generateFingerprint();
  }, []);

  /**
   * Handle registration form submission with security checks
   */
  const handleRegister = useCallback(async (formData: {
    email: string;
    password: string;
    name: string;
    acceptTerms: boolean;
    gdprConsent: boolean;
  }) => {
    try {
      // Check registration attempts
      if (registrationAttempts >= MAX_REGISTRATION_ATTEMPTS) {
        const cooldownRemaining = REGISTRATION_COOLDOWN - (Date.now() - lastAttemptTime);
        if (cooldownRemaining > 0) {
          showNotification({
            message: `Too many registration attempts. Please try again in ${Math.ceil(cooldownRemaining / 60000)} minutes.`,
            type: 'error'
          });
          return;
        }
        // Reset attempts after cooldown
        setRegistrationAttempts(0);
      }

      // Validate password complexity
      const passwordValidation = validatePasswordComplexity(formData.password);
      if (!passwordValidation.isValid) {
        showNotification({
          message: passwordValidation.error || 'Password does not meet security requirements',
          type: 'error'
        });
        return;
      }

      // Add security metadata
      const registrationData = {
        ...formData,
        deviceFingerprint,
        registrationTimestamp: new Date().toISOString(),
        securityMetadata: {
          attempts: registrationAttempts + 1,
          lastAttempt: Date.now(),
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      };

      // Attempt registration
      await login({
        email: registrationData.email,
        password: registrationData.password,
        provider: 'LOCAL'
      });

      // Update security tracking
      setRegistrationAttempts(prev => prev + 1);
      setLastAttemptTime(Date.now());

      // Show success notification
      showNotification({
        message: 'Registration successful! Welcome to Task Management System.',
        type: 'success'
      });

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      // Update security tracking
      setRegistrationAttempts(prev => prev + 1);
      setLastAttemptTime(Date.now());

      showNotification({
        message: error.message || 'Registration failed. Please try again.',
        type: 'error'
      });
    }
  }, [
    navigate,
    login,
    showNotification,
    registrationAttempts,
    lastAttemptTime,
    deviceFingerprint
  ]);

  // Clean up sensitive data on unmount
  useEffect(() => {
    return () => {
      setDeviceFingerprint('');
    };
  }, []);

  return (
    <AuthLayout
      title="Create Account"
      error={error}
      loading={loading}
    >
      <RegisterForm
        onSubmit={handleRegister}
        loading={loading}
        onValidationError={(errors) => {
          showNotification({
            message: errors[0].message,
            type: 'error'
          });
        }}
      />
    </AuthLayout>
  );
};

export default Register;