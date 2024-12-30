/**
 * @fileoverview Date utility functions for task management system
 * @version 1.0.0
 * @package date-fns v2.30.0
 */

import {
  format,
  isValid,
  parseISO,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  isWithinInterval,
  formatDistanceToNow,
} from 'date-fns';

// Type definitions
type DateInput = Date | string | null;
type LocaleConfig = {
  locale?: Locale;
};

// Constants
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const FALLBACK_DATE_STRING = 'Invalid date';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

/**
 * Formats a date into a standardized string representation
 * @param date - Date to format
 * @param formatPattern - Date format pattern
 * @param locale - Optional locale configuration
 * @returns Formatted date string or fallback value
 */
export const formatDate = (
  date: DateInput,
  formatPattern: string = DEFAULT_DATE_FORMAT,
  locale?: Locale
): string => {
  try {
    if (!date) {
      return FALLBACK_DATE_STRING;
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(parsedDate)) {
      console.warn('Invalid date provided to formatDate:', date);
      return FALLBACK_DATE_STRING;
    }

    return format(parsedDate, formatPattern, { locale });
  } catch (error) {
    console.error('Error formatting date:', error);
    return FALLBACK_DATE_STRING;
  }
};

/**
 * Safely parses a date string into a Date object
 * @param dateString - Date string to parse
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = (dateString: string | null | undefined): Date | null => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const trimmedDate = dateString.trim();
    if (!DATE_REGEX.test(trimmedDate)) {
      console.warn('Invalid date string format:', dateString);
      return null;
    }

    const parsedDate = parseISO(trimmedDate);
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Calculates days remaining until due date
 * @param dueDate - Target due date
 * @returns Number of days remaining or null if invalid
 */
export const getDaysRemaining = (dueDate: DateInput): number | null => {
  try {
    if (!dueDate) {
      return null;
    }

    const parsedDueDate = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    if (!isValid(parsedDueDate)) {
      return null;
    }

    const today = startOfDay(new Date());
    const targetDate = startOfDay(parsedDueDate);
    return differenceInDays(targetDate, today);
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return null;
  }
};

/**
 * Checks if a date is in the past (overdue)
 * @param date - Date to check
 * @returns True if date is in the past, false otherwise
 */
export const isOverdue = (date: DateInput): boolean => {
  try {
    if (!date) {
      return false;
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return false;
    }

    const now = new Date();
    return isBefore(parsedDate, startOfDay(now));
  } catch (error) {
    console.error('Error checking overdue status:', error);
    return false;
  }
};

/**
 * Checks if a date falls within a specified range
 * @param date - Date to check
 * @param startDate - Start of range
 * @param endDate - End of range
 * @returns True if date is within range, false otherwise
 */
export const isWithinDateRange = (
  date: DateInput,
  startDate: DateInput,
  endDate: DateInput
): boolean => {
  try {
    if (!date || !startDate || !endDate) {
      return false;
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    const parsedStart = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const parsedEnd = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    if (!isValid(parsedDate) || !isValid(parsedStart) || !isValid(parsedEnd)) {
      return false;
    }

    if (isAfter(parsedStart, parsedEnd)) {
      console.warn('Invalid date range: start date is after end date');
      return false;
    }

    return isWithinInterval(parsedDate, {
      start: startOfDay(parsedStart),
      end: endOfDay(parsedEnd),
    });
  } catch (error) {
    console.error('Error checking date range:', error);
    return false;
  }
};

/**
 * Returns an accessible, localized relative date label
 * @param date - Date to format
 * @param locale - Optional locale configuration
 * @returns Localized, human-readable date label
 */
export const getRelativeDateLabel = (date: DateInput, locale?: Locale): string => {
  try {
    if (!date) {
      return FALLBACK_DATE_STRING;
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return FALLBACK_DATE_STRING;
    }

    const relativeDate = formatDistanceToNow(parsedDate, { 
      addSuffix: true,
      locale 
    });

    // Add absolute date for screen readers
    const absoluteDate = format(parsedDate, 'PPP', { locale });
    return `${relativeDate} (${absoluteDate})`;
  } catch (error) {
    console.error('Error generating relative date label:', error);
    return FALLBACK_DATE_STRING;
  }
};