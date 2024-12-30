/**
 * @fileoverview Unit tests for date utility functions
 * @version 1.0.0
 */

import {
  formatDate,
  parseDate,
  calculateDaysRemaining,
  isOverdue,
  addBusinessDays,
  convertTimezone,
  getBusinessDaysBetween
} from '../../src/utils/date.util';
import { Task } from '../../src/types/task.types';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock current date for consistent testing
const MOCK_NOW = new Date('2024-01-15T12:00:00Z');
const MOCK_HOLIDAYS = [
  new Date('2024-01-01T00:00:00Z'), // New Year's Day
  new Date('2024-12-25T00:00:00Z')  // Christmas
];

describe('Date Utility Functions', () => {
  beforeEach(() => {
    // Mock Date.now() for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    test('should format date with default UTC timezone', () => {
      const date = new Date('2024-01-15T15:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-01-15T15:30:00Z');
    });

    test('should format date with specific timezone', () => {
      const date = new Date('2024-01-15T15:30:00Z');
      const formatted = formatDate(date, 'yyyy-MM-dd\'T\'HH:mm:ssXXX', 'America/New_York');
      expect(formatted).toBe('2024-01-15T10:30:00-05:00');
    });

    test('should handle daylight savings transitions', () => {
      const summerDate = new Date('2024-07-15T15:30:00Z');
      const formatted = formatDate(summerDate, 'yyyy-MM-dd\'T\'HH:mm:ssXXX', 'America/New_York');
      expect(formatted).toBe('2024-07-15T11:30:00-04:00');
    });

    test('should throw error for invalid date', () => {
      expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date provided');
    });

    test('should meet performance requirements', () => {
      const date = new Date('2024-01-15T15:30:00Z');
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        formatDate(date);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(500); // Should process 1000 operations within 500ms
    });
  });

  describe('parseDate', () => {
    test('should parse ISO date string in UTC', () => {
      const dateStr = '2024-01-15T15:30:00Z';
      const parsed = parseDate(dateStr);
      expect(parsed.toISOString()).toBe(dateStr);
    });

    test('should parse date string with timezone', () => {
      const dateStr = '2024-01-15T10:30:00-05:00';
      const parsed = parseDate(dateStr, 'America/New_York');
      expect(parsed.toISOString()).toBe('2024-01-15T15:30:00.000Z');
    });

    test('should throw error for invalid date string', () => {
      expect(() => parseDate('invalid')).toThrow('Invalid date format');
    });

    test('should meet performance requirements', () => {
      const dateStr = '2024-01-15T15:30:00Z';
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        parseDate(dateStr);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(500);
    });
  });

  describe('calculateDaysRemaining', () => {
    test('should calculate remaining days correctly', () => {
      const dueDate = new Date('2024-01-20T12:00:00Z');
      const remaining = calculateDaysRemaining(dueDate);
      expect(remaining).toBe(5); // 5 days from mock current date
    });

    test('should handle timezone differences', () => {
      const dueDate = new Date('2024-01-20T03:00:00Z');
      const remaining = calculateDaysRemaining(dueDate, 'Asia/Tokyo');
      expect(remaining).toBe(5); // Should still be 5 days despite timezone difference
    });

    test('should return negative days for overdue tasks', () => {
      const dueDate = new Date('2024-01-10T12:00:00Z');
      const remaining = calculateDaysRemaining(dueDate);
      expect(remaining).toBe(-5); // 5 days overdue
    });
  });

  describe('addBusinessDays', () => {
    test('should add business days excluding weekends', () => {
      const startDate = new Date('2024-01-15T12:00:00Z'); // Monday
      const result = addBusinessDays(startDate, 5);
      expect(result.toISOString()).toBe('2024-01-22T12:00:00.000Z'); // Next Monday
    });

    test('should exclude holidays', () => {
      const startDate = new Date('2023-12-22T12:00:00Z'); // Friday before Christmas
      const result = addBusinessDays(startDate, 3, MOCK_HOLIDAYS);
      expect(result.toISOString()).toBe('2023-12-28T12:00:00.000Z'); // Thursday after Christmas
    });

    test('should handle negative business days', () => {
      const startDate = new Date('2024-01-15T12:00:00Z'); // Monday
      const result = addBusinessDays(startDate, -5);
      expect(result.toISOString()).toBe('2024-01-08T12:00:00.000Z'); // Previous Monday
    });

    test('should respect timezone when calculating business days', () => {
      const startDate = new Date('2024-01-15T20:00:00Z');
      const result = addBusinessDays(startDate, 1, [], 'Asia/Tokyo');
      // Should be next business day in Tokyo timezone
      expect(result.toISOString()).toBe('2024-01-16T20:00:00.000Z');
    });
  });

  describe('isOverdue', () => {
    test('should identify overdue tasks', () => {
      const dueDate = new Date('2024-01-10T12:00:00Z');
      expect(isOverdue(dueDate)).toBe(true);
    });

    test('should handle timezone-specific overdue checks', () => {
      const dueDate = new Date('2024-01-15T15:00:00Z');
      expect(isOverdue(dueDate, 'America/New_York')).toBe(false);
    });

    test('should handle same-day due dates', () => {
      const dueDate = new Date('2024-01-15T11:59:59Z');
      expect(isOverdue(dueDate)).toBe(true);
    });
  });

  // Integration tests combining multiple functions
  describe('Date Utility Integration', () => {
    test('should handle complete task lifecycle dates', () => {
      const taskDueDate = new Date('2024-01-20T12:00:00Z');
      const formattedDue = formatDate(taskDueDate);
      const remaining = calculateDaysRemaining(taskDueDate);
      const isLate = isOverdue(taskDueDate);

      expect(formattedDue).toBe('2024-01-20T12:00:00Z');
      expect(remaining).toBe(5);
      expect(isLate).toBe(false);
    });

    test('should maintain consistency across timezone conversions', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const nycFormatted = formatDate(date, 'yyyy-MM-dd\'T\'HH:mm:ssXXX', 'America/New_York');
      const tokyoFormatted = formatDate(date, 'yyyy-MM-dd\'T\'HH:mm:ssXXX', 'Asia/Tokyo');
      
      const nycParsed = parseDate(nycFormatted, 'America/New_York');
      const tokyoParsed = parseDate(tokyoFormatted, 'Asia/Tokyo');

      expect(nycParsed.toISOString()).toBe(tokyoParsed.toISOString());
    });
  });
});