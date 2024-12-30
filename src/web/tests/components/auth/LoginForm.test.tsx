/**
 * @fileoverview Comprehensive test suite for LoginForm component validating
 * authentication flow, form validation, accessibility compliance, and security measures.
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import LoginForm from '../../../../src/components/auth/LoginForm';
import { useAuth } from '../../../../src/hooks/useAuth';
import { ApiErrorCode } from '../../../../src/types/api.types';
import { AUTH_VALIDATION } from '../../../../src/constants/validation.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
jest.mock('../../../../src/hooks/useAuth');

describe('LoginForm', () => {
  // Test data
  const validCredentials = {
    email: 'test@example.com',
    password: 'Password123!@#'
  };

  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form elements correctly', () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Verify form elements
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders SSO button when ssoEnabled is true', () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
          ssoEnabled={true}
        />
      );

      expect(screen.getByRole('button', { name: /sign in with sso/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Submit empty form
      fireEvent.submit(screen.getByRole('form'));

      // Check for validation messages
      await waitFor(() => {
        expect(screen.getByText(AUTH_VALIDATION.EMAIL.messages.required)).toBeInTheDocument();
        expect(screen.getByText(AUTH_VALIDATION.PASSWORD.messages.required)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Enter invalid email
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
      fireEvent.blur(screen.getByLabelText(/email/i));

      // Check for validation message
      await waitFor(() => {
        expect(screen.getByText(AUTH_VALIDATION.EMAIL.messages.pattern)).toBeInTheDocument();
      });
    });

    it('validates password complexity', async () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Enter weak password
      await userEvent.type(screen.getByLabelText(/password/i), 'weak');
      fireEvent.blur(screen.getByLabelText(/password/i));

      // Check for validation message
      await waitFor(() => {
        expect(screen.getByText(AUTH_VALIDATION.PASSWORD.messages.pattern)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('handles successful login', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessTokenExpires: Date.now() + 3600000,
        refreshTokenExpires: Date.now() + 86400000
      };

      mockLogin.mockResolvedValueOnce(mockTokens);

      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Fill form with valid credentials
      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      
      // Submit form
      fireEvent.submit(screen.getByRole('form'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: validCredentials.email,
          password: validCredentials.password,
          rememberMe: false
        });
        expect(mockOnSuccess).toHaveBeenCalledWith(mockTokens);
      });
    });

    it('handles authentication errors', async () => {
      const mockError = {
        message: 'Invalid credentials',
        code: ApiErrorCode.UNAUTHORIZED,
        status: 401
      };

      mockLogin.mockRejectedValueOnce(mockError);

      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Fill and submit form
      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      fireEvent.submit(screen.getByRole('form'));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(mockError);
        expect(screen.getByText(mockError.message)).toBeInTheDocument();
      });
    });

    it('handles rate limiting', async () => {
      const mockRateLimitError = {
        message: 'Too many login attempts',
        code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        status: 429
      };

      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
          maxAttempts={3}
        />
      );

      // Attempt multiple logins
      for (let i = 0; i < 4; i++) {
        mockLogin.mockRejectedValueOnce(mockRateLimitError);
        
        await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
        await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
        fireEvent.submit(screen.getByRole('form'));

        await waitFor(() => {
          if (i >= 3) {
            expect(screen.getByText(/account locked/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
          }
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Tab through form elements
      await userEvent.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
    });

    it('announces form errors to screen readers', async () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      // Submit invalid form
      fireEvent.submit(screen.getByRole('form'));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(2); // Email and password errors
        expect(alerts[0]).toHaveTextContent(AUTH_VALIDATION.EMAIL.messages.required);
        expect(alerts[1]).toHaveTextContent(AUTH_VALIDATION.PASSWORD.messages.required);
      });
    });
  });

  describe('Security Features', () => {
    it('masks password input', () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('prevents XSS attacks', async () => {
      const xssAttempt = "<script>alert('xss')</script>";
      
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      await userEvent.type(screen.getByLabelText(/email/i), xssAttempt);
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).not.toContain('<script>');
    });

    it('implements proper ARIA attributes', () => {
      render(
        <LoginForm 
          onSuccess={mockOnSuccess} 
          onError={mockOnError}
        />
      );

      expect(screen.getByRole('form')).toHaveAttribute('aria-labelledby', 'login-title');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-required', 'true');
    });
  });
});