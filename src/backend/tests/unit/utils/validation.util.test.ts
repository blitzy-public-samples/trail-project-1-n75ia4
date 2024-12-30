/**
 * @fileoverview Comprehensive test suite for validation utilities
 * @version 1.0.0
 * @module tests/unit/utils/validation
 */

// External imports - versions specified for security compliance
import { describe, it, expect, beforeEach, afterEach, jest } from 'jest'; // ^29.0.0
import { performance } from 'perf_hooks'; // ^1.0.0

// Internal imports
import {
  validateUUID,
  validateEmail,
  validateTaskStatus,
  validateProjectStatus,
  validatePriority,
  validateUserRole,
  validateDate,
  sanitizeInput
} from '../../../src/utils/validation.util';

import {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  ProjectPriority,
  UserRole
} from '../../../src/types';

describe('Validation Utilities', () => {
  // UUID Validation Tests
  describe('validateUUID', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should validate correct UUID format with performance benchmark', () => {
      const start = performance.now();
      const result = validateUUID(validUUID);
      const end = performance.now();
      
      expect(result).toBe(true);
      expect(end - start).toBeLessThan(5); // Should complete within 5ms
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '123456',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // incomplete
        '123e4567-e89b-12d3-a456-42661417400g' // invalid character
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });

    it('should handle empty/null/undefined inputs', () => {
      expect(validateUUID('')).toBe(false);
      expect(validateUUID(null as any)).toBe(false);
      expect(validateUUID(undefined as any)).toBe(false);
    });

    it('should perform well under load', async () => {
      const iterations = 1000;
      const start = performance.now();
      
      const promises = Array(iterations).fill(validUUID).map(validateUUID);
      await Promise.all(promises);
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      expect(avgTime).toBeLessThan(1); // Average time should be under 1ms
    });
  });

  // Email Validation Tests
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@domain.com',
        'valid@subdomain.domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject email injection attempts', () => {
      const maliciousEmails = [
        'test@domain.com;DROP TABLE users',
        'test@domain.com\' OR \'1\'=\'1',
        '"><script>alert(1)</script>@domain.com',
        'test@domain.com\x00'
      ];

      maliciousEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle international domains correctly', () => {
      const internationalEmails = [
        'user@domain.co.jp',
        'user@domain.香港',
        'user@domain.рф'
      ];

      internationalEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject common XSS patterns', () => {
      const xssEmails = [
        '<script>@domain.com',
        'test@><script>alert(1)</script>.com',
        'test@domain.com<img src=x onerror=alert(1)>',
        'javascript:alert(1)@domain.com'
      ];

      xssEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  // Input Sanitization Tests
  describe('sanitizeInput', () => {
    it('should remove HTML tags and preserve content', () => {
      const input = '<p>Hello</p><script>alert(1)</script>World';
      expect(sanitizeInput(input)).toBe('HelloWorld');
    });

    it('should handle nested HTML and script tags', () => {
      const input = '<div><p>Text</p><script>alert(1)</script></div>';
      expect(sanitizeInput(input)).toBe('Text');
    });

    it('should prevent SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "); DELETE FROM tasks; --"
      ];

      sqlInjections.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('DELETE');
      });
    });

    it('should handle XSS attack vectors', () => {
      const xssVectors = [
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>'
      ];

      xssVectors.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
      });
    });

    it('should maintain performance with large inputs', () => {
      const largeInput = 'A'.repeat(10000);
      const start = performance.now();
      const sanitized = sanitizeInput(largeInput);
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should process within 50ms
      expect(sanitized.length).toBeLessThanOrEqual(1000); // Max length check
    });
  });

  // Status Validation Tests
  describe('validateTaskStatus', () => {
    it('should validate all defined task statuses', () => {
      Object.values(TaskStatus).forEach(status => {
        expect(validateTaskStatus(status)).toBe(true);
      });
    });

    it('should reject invalid task statuses', () => {
      expect(validateTaskStatus('INVALID_STATUS')).toBe(false);
      expect(validateTaskStatus('')).toBe(false);
      expect(validateTaskStatus('123')).toBe(false);
    });
  });

  // Priority Validation Tests
  describe('validatePriority', () => {
    it('should validate task priorities', () => {
      Object.values(TaskPriority).forEach(priority => {
        expect(validatePriority(priority, 'task')).toBe(true);
      });
    });

    it('should validate project priorities', () => {
      Object.values(ProjectPriority).forEach(priority => {
        expect(validatePriority(priority, 'project')).toBe(true);
      });
    });

    it('should reject invalid priorities', () => {
      expect(validatePriority('INVALID', 'task')).toBe(false);
      expect(validatePriority('INVALID', 'project')).toBe(false);
    });
  });

  // Date Validation Tests
  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      const validDates = [
        new Date().toISOString(),
        new Date(Date.now() + 86400000).toISOString() // Tomorrow
      ];

      validDates.forEach(date => {
        expect(validateDate(date)).toBe(true);
      });
    });

    it('should reject dates too far in the future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 11);
      expect(validateDate(farFuture.toISOString())).toBe(false);
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        'not-a-date',
        '2023-13-45', // Invalid month/day
        '2023/25/12', // Wrong format
      ];

      invalidDates.forEach(date => {
        expect(validateDate(date)).toBe(false);
      });
    });
  });

  // User Role Validation Tests
  describe('validateUserRole', () => {
    it('should validate all defined user roles', () => {
      Object.values(UserRole).forEach(role => {
        expect(validateUserRole(role)).toBe(true);
      });
    });

    it('should reject invalid user roles', () => {
      expect(validateUserRole('SUPER_ADMIN')).toBe(false);
      expect(validateUserRole('')).toBe(false);
      expect(validateUserRole('123')).toBe(false);
    });
  });
});