/**
 * @fileoverview Comprehensive test suite for validation utility functions
 * Testing form validation, data integrity, and security measures
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { faker } from '@faker-js/faker'; // v8.0.0
import {
  validateEmail,
  validatePassword,
  validateDate,
  sanitizeInput
} from '../../src/utils/validation.utils';
import {
  AUTH_VALIDATION,
  PROJECT_VALIDATION,
  TASK_VALIDATION
} from '../../src/constants/validation.constants';

describe('Email Validation Tests', () => {
  it('should validate standard email formats', async () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+label@domain.co.uk'
    ];

    for (const email of validEmails) {
      const result = await validateEmail(email);
      expect(result.isValid).toBe(true);
    }
  });

  it('should validate international domain emails', async () => {
    const internationalEmails = [
      'user@münchen.de',
      'test@académie.fr',
      'info@中国.中国'
    ];

    for (const email of internationalEmails) {
      const result = await validateEmail(email);
      expect(result.isValid).toBe(true);
    }
  });

  it('should reject malformed email formats', async () => {
    const invalidEmails = [
      'invalid.email',
      '@nodomain.com',
      'spaces in@email.com',
      'email@.com',
      'email@domain.',
      'email@domain'
    ];

    for (const email of invalidEmails) {
      const result = await validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    }
  });

  it('should validate email length limits', async () => {
    const longEmail = `${'a'.repeat(255)}@example.com`;
    const tooLongEmail = `${'a'.repeat(256)}@example.com`;

    const validResult = await validateEmail(longEmail);
    expect(validResult.isValid).toBe(true);

    const invalidResult = await validateEmail(tooLongEmail);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain('too long');
  });

  it('should detect disposable email domains', async () => {
    const disposableEmails = [
      'test@tempmail.com',
      'user@throwaway.com'
    ];

    for (const email of disposableEmails) {
      const result = await validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Disposable email');
    }
  });
});

describe('Password Validation Tests', () => {
  it('should enforce minimum complexity requirements', async () => {
    const validPasswords = [
      'SecurePass123!',
      'Complex@Password789',
      'ValidP@ssw0rd'
    ];

    for (const password of validPasswords) {
      const result = await validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
    }
  });

  it('should validate password length constraints', async () => {
    const shortPassword = 'Short1!';
    const longPassword = 'A1!'.repeat(50);

    const shortResult = await validatePassword(shortPassword);
    expect(shortResult.isValid).toBe(false);
    expect(shortResult.error).toContain('at least');

    const longResult = await validatePassword(longPassword);
    expect(longResult.isValid).toBe(false);
    expect(longResult.error).toContain('exceed');
  });

  it('should provide strength score and suggestions', async () => {
    const weakPassword = 'password123';
    const result = await validatePassword(weakPassword);
    
    expect(result.isValid).toBe(false);
    expect(result.score).toBeDefined();
    expect(result.suggestions).toBeInstanceOf(Array);
    expect(result.suggestions?.length).toBeGreaterThan(0);
  });

  it('should support Unicode passwords', async () => {
    const unicodePasswords = [
      'パスワード123!A',
      'Пароль123!Test',
      'كلمةالمرور123!A'
    ];

    for (const password of unicodePasswords) {
      const result = await validatePassword(password);
      expect(result.isValid).toBe(true);
    }
  });
});

describe('Input Sanitization Tests', () => {
  it('should prevent XSS attack patterns', () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '<a href="javascript:void(0)">click</a>'
    ];

    for (const input of maliciousInputs) {
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror');
    }
  });

  it('should handle special characters safely', () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const sanitized = sanitizeInput(specialChars);
    expect(sanitized).toBe(specialChars);
  });

  it('should preserve valid Unicode characters', () => {
    const unicodeText = '안녕하세요 こんにちは 你好';
    const sanitized = sanitizeInput(unicodeText);
    expect(sanitized).toBe(unicodeText);
  });

  it('should enforce maximum length limits', () => {
    const longInput = 'a'.repeat(2000);
    const maxLength = 1000;
    
    const sanitized = sanitizeInput(longInput, { maxLength });
    expect(sanitized.length).toBe(maxLength);
  });

  it('should handle HTML content according to allowed tags', () => {
    const htmlInput = '<p>Valid text</p><script>alert("invalid")</script>';
    const sanitized = sanitizeInput(htmlInput, {
      allowedTags: ['p']
    });

    expect(sanitized).toContain('<p>');
    expect(sanitized).not.toContain('<script>');
  });
});

describe('Performance Tests', () => {
  it('should handle large inputs efficiently', () => {
    const largeInput = faker.lorem.paragraphs(100);
    const startTime = performance.now();
    
    sanitizeInput(largeInput);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(100); // Should process within 100ms
  });

  it('should handle concurrent validation requests', async () => {
    const emails = Array(100).fill(null).map(() => faker.internet.email());
    
    const startTime = performance.now();
    await Promise.all(emails.map(email => validateEmail(email)));
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
  });
});