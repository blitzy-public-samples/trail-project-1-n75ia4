/**
 * @fileoverview Project validation schemas using Yup for comprehensive form and data validation
 * Implements strict validation rules for project creation and updates with enhanced security
 * @version 1.0.0
 */

import { object, string, date, array, mixed, SchemaOf } from 'yup'; // v1.3.2
import { 
  CreateProjectDTO, 
  UpdateProjectDTO, 
  ProjectStatus, 
  ProjectPriority 
} from '../types/project.types';
import { PROJECT_VALIDATION } from '../constants/validation.constants';

/**
 * Validates project dates against business rules and constraints
 * @param startDate - Project start date
 * @param endDate - Project end date
 * @returns boolean indicating if dates are valid
 */
const validateProjectDates = (startDate: Date, endDate: Date): boolean => {
  // Convert to UTC for consistent comparison
  const start = new Date(startDate).setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate).setUTCHours(0, 0, 0, 0);
  const today = new Date().setUTCHours(0, 0, 0, 0);

  // Start date must not be in past
  if (start < today) {
    return false;
  }

  // End date must be after start date
  if (end <= start) {
    return false;
  }

  // Maximum project duration is 2 years (730 days)
  const maxDuration = 730 * 24 * 60 * 60 * 1000; // 730 days in milliseconds
  if (end - start > maxDuration) {
    return false;
  }

  return true;
};

/**
 * Validates team member composition and roles
 * @param memberIds - Array of team member UUIDs
 * @returns boolean indicating if team composition is valid
 */
const validateTeamMembers = (memberIds: string[]): boolean => {
  // Check for duplicate members
  const uniqueMembers = new Set(memberIds);
  if (uniqueMembers.size !== memberIds.length) {
    return false;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return memberIds.every(id => uuidRegex.test(id));
};

/**
 * Comprehensive validation schema for project creation
 * Implements strict validation rules with enhanced security checks
 */
export const createProjectSchema: SchemaOf<CreateProjectDTO> = object({
  name: string()
    .required(PROJECT_VALIDATION.NAME.messages.required)
    .min(PROJECT_VALIDATION.NAME.minLength, PROJECT_VALIDATION.NAME.messages.minLength)
    .max(PROJECT_VALIDATION.NAME.maxLength, PROJECT_VALIDATION.NAME.messages.maxLength)
    .matches(PROJECT_VALIDATION.NAME.pattern, PROJECT_VALIDATION.NAME.messages.pattern)
    .trim(),

  description: string()
    .required(PROJECT_VALIDATION.DESCRIPTION.messages.required)
    .min(PROJECT_VALIDATION.DESCRIPTION.minLength, PROJECT_VALIDATION.DESCRIPTION.messages.minLength)
    .max(PROJECT_VALIDATION.DESCRIPTION.maxLength, PROJECT_VALIDATION.DESCRIPTION.messages.maxLength)
    .trim(),

  priority: mixed<ProjectPriority>()
    .required('Project priority is required')
    .oneOf(Object.values(ProjectPriority), 'Invalid project priority'),

  startDate: date()
    .required(PROJECT_VALIDATION.DATES.messages.startRequired)
    .min(new Date(), PROJECT_VALIDATION.DATES.messages.startAfterToday),

  endDate: date()
    .required(PROJECT_VALIDATION.DATES.messages.endRequired)
    .when('startDate', (startDate, schema) => 
      schema.min(startDate, PROJECT_VALIDATION.DATES.messages.endAfterStart)
    ),

  teamMembers: array()
    .of(string().required('Team member ID is required'))
    .required('Team members are required')
    .min(1, 'At least one team member is required')
    .test('valid-team', 'Invalid team composition', validateTeamMembers),

  tags: array()
    .of(string()
      .matches(PROJECT_VALIDATION.TAGS.pattern, PROJECT_VALIDATION.TAGS.messages.pattern)
      .max(PROJECT_VALIDATION.TAGS.maxLength, PROJECT_VALIDATION.TAGS.messages.maxLength)
    )
    .max(PROJECT_VALIDATION.TAGS.maxTags, PROJECT_VALIDATION.TAGS.messages.maxTags)
    .test('unique-tags', PROJECT_VALIDATION.TAGS.messages.duplicate, 
      tags => tags ? new Set(tags).size === tags.length : true
    ),

  budget: number()
    .optional()
    .positive('Budget must be a positive number')
    .max(1000000000, 'Budget cannot exceed 1 billion')
}).test('valid-dates', PROJECT_VALIDATION.DATES.messages.maxDuration,
  values => values.startDate && values.endDate ? 
    validateProjectDates(values.startDate, values.endDate) : true
);

/**
 * Validation schema for project updates with partial validation support
 * Implements transition rules and change validation
 */
export const updateProjectSchema: SchemaOf<UpdateProjectDTO> = object({
  name: string()
    .optional()
    .min(PROJECT_VALIDATION.NAME.minLength, PROJECT_VALIDATION.NAME.messages.minLength)
    .max(PROJECT_VALIDATION.NAME.maxLength, PROJECT_VALIDATION.NAME.messages.maxLength)
    .matches(PROJECT_VALIDATION.NAME.pattern, PROJECT_VALIDATION.NAME.messages.pattern)
    .trim(),

  description: string()
    .optional()
    .min(PROJECT_VALIDATION.DESCRIPTION.minLength, PROJECT_VALIDATION.DESCRIPTION.messages.minLength)
    .max(PROJECT_VALIDATION.DESCRIPTION.maxLength, PROJECT_VALIDATION.DESCRIPTION.messages.maxLength)
    .trim(),

  status: mixed<ProjectStatus>()
    .optional()
    .oneOf(Object.values(ProjectStatus), 'Invalid project status'),

  priority: mixed<ProjectPriority>()
    .optional()
    .oneOf(Object.values(ProjectPriority), 'Invalid project priority'),

  startDate: date()
    .optional()
    .min(new Date(), PROJECT_VALIDATION.DATES.messages.startAfterToday),

  endDate: date()
    .optional()
    .when('startDate', (startDate, schema) => 
      startDate ? schema.min(startDate, PROJECT_VALIDATION.DATES.messages.endAfterStart) : schema
    ),

  teamMembers: array()
    .of(string().required('Team member ID is required'))
    .optional()
    .min(1, 'At least one team member is required')
    .test('valid-team', 'Invalid team composition', members => 
      members ? validateTeamMembers(members) : true
    ),

  tags: array()
    .of(string()
      .matches(PROJECT_VALIDATION.TAGS.pattern, PROJECT_VALIDATION.TAGS.messages.pattern)
      .max(PROJECT_VALIDATION.TAGS.maxLength, PROJECT_VALIDATION.TAGS.messages.maxLength)
    )
    .optional()
    .max(PROJECT_VALIDATION.TAGS.maxTags, PROJECT_VALIDATION.TAGS.messages.maxTags)
    .test('unique-tags', PROJECT_VALIDATION.TAGS.messages.duplicate, 
      tags => tags ? new Set(tags).size === tags.length : true
    ),

  budget: number()
    .optional()
    .positive('Budget must be a positive number')
    .max(1000000000, 'Budget cannot exceed 1 billion')
}).test('valid-dates', PROJECT_VALIDATION.DATES.messages.maxDuration,
  values => values.startDate && values.endDate ? 
    validateProjectDates(values.startDate, values.endDate) : true
);