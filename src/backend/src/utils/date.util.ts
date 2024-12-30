/**
 * @fileoverview Advanced date manipulation utilities for task management system
 * @version 1.0.0
 * @module utils/date
 * 
 * This module provides comprehensive date handling functionality with timezone support,
 * business day calculations, and internationalization features as specified in the
 * technical requirements for task and project timeline management.
 */

// External imports - date-fns v2.30.0
import {
  format,
  isValid,
  parseISO,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  getDay,
  setHours,
  setMinutes
} from 'date-fns';

// External imports - date-fns-tz v2.0.0
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Internal imports
import { Task } from '../types';

/**
 * Error messages for date-related operations
 */
const DATE_ERRORS = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid date format',
  INVALID_TIMEZONE: 'Invalid timezone identifier',
  INVALID_BUSINESS_DAYS: 'Invalid business days count'
} as const;

/**
 * Default format string for date formatting
 */
const DEFAULT_FORMAT = 'yyyy-MM-dd\'T\'HH:mm:ssXXX';

/**
 * Formats a date into a standardized string representation with timezone support
 * 
 * @param date - The date to format
 * @param formatString - Optional format string (defaults to ISO format)
 * @param timezone - Target timezone (defaults to UTC)
 * @returns Formatted date string in specified timezone
 * @throws Error if date is invalid
 */
export const formatDate = (
  date: Date,
  formatString: string = DEFAULT_FORMAT,
  timezone: string = 'UTC'
): string => {
  if (!isValid(date)) {
    throw new Error(DATE_ERRORS.INVALID_DATE);
  }

  try {
    // Convert to target timezone
    const zonedDate = utcToZonedTime(date, timezone);
    return format(zonedDate, formatString);
  } catch (error) {
    throw new Error(`${DATE_ERRORS.INVALID_TIMEZONE}: ${error.message}`);
  }
};

/**
 * Parses a date string into a valid Date object with timezone handling
 * 
 * @param dateString - The date string to parse
 * @param timezone - Source timezone of the date string
 * @returns Parsed Date object in UTC
 * @throws Error if date string is invalid
 */
export const parseDate = (dateString: string, timezone: string = 'UTC'): Date => {
  try {
    const parsedDate = parseISO(dateString);
    
    if (!isValid(parsedDate)) {
      throw new Error(DATE_ERRORS.INVALID_FORMAT);
    }

    // Convert to UTC from source timezone
    return zonedTimeToUtc(parsedDate, timezone);
  } catch (error) {
    throw new Error(`${DATE_ERRORS.INVALID_FORMAT}: ${error.message}`);
  }
};

/**
 * Calculates the number of days remaining until a due date with timezone awareness
 * 
 * @param dueDate - The target due date
 * @param timezone - Timezone for calculation
 * @returns Number of days remaining (negative if overdue)
 */
export const calculateDaysRemaining = (
  dueDate: Date,
  timezone: string = 'UTC'
): number => {
  if (!isValid(dueDate)) {
    throw new Error(DATE_ERRORS.INVALID_DATE);
  }

  const now = new Date();
  const zonedDueDate = utcToZonedTime(dueDate, timezone);
  const zonedNow = utcToZonedTime(now, timezone);

  // Reset time components for accurate day calculation
  const normalizedDueDate = setMinutes(setHours(zonedDueDate, 0), 0);
  const normalizedNow = setMinutes(setHours(zonedNow, 0), 0);

  return differenceInDays(normalizedDueDate, normalizedNow);
};

/**
 * Checks if a due date has passed with timezone consideration
 * 
 * @param dueDate - The due date to check
 * @param timezone - Timezone for comparison
 * @returns True if the due date has passed
 */
export const isOverdue = (dueDate: Date, timezone: string = 'UTC'): boolean => {
  if (!isValid(dueDate)) {
    throw new Error(DATE_ERRORS.INVALID_DATE);
  }

  const now = new Date();
  const zonedDueDate = utcToZonedTime(dueDate, timezone);
  const zonedNow = utcToZonedTime(now, timezone);

  return isBefore(zonedDueDate, zonedNow);
};

/**
 * Adds a specified number of business days to a date, excluding weekends and holidays
 * 
 * @param date - The starting date
 * @param days - Number of business days to add (can be negative)
 * @param holidays - Array of holiday dates to exclude
 * @param timezone - Timezone for calculations
 * @returns New date with business days added
 */
export const addBusinessDays = (
  date: Date,
  days: number,
  holidays: Date[] = [],
  timezone: string = 'UTC'
): Date => {
  if (!isValid(date) || !Number.isInteger(days)) {
    throw new Error(DATE_ERRORS.INVALID_BUSINESS_DAYS);
  }

  const zonedDate = utcToZonedTime(date, timezone);
  let currentDate = zonedDate;
  let remainingDays = days;
  const direction = Math.sign(days);

  // Convert holidays to timezone-aware dates
  const zonedHolidays = holidays.map(holiday => utcToZonedTime(holiday, timezone));

  while (remainingDays !== 0) {
    currentDate = addDays(currentDate, direction);
    const dayOfWeek = getDay(currentDate);

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    // Skip holidays
    const isHoliday = zonedHolidays.some(holiday =>
      format(holiday, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
    );
    if (isHoliday) {
      continue;
    }

    remainingDays -= direction;
  }

  // Convert back to UTC before returning
  return zonedTimeToUtc(currentDate, timezone);
};

/**
 * Type guard to check if a date string is valid
 * 
 * @param dateString - The date string to validate
 * @returns True if the date string is valid
 */
export const isValidDateString = (dateString: string): boolean => {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed);
  } catch {
    return false;
  }
};