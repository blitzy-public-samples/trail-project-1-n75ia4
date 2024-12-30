/**
 * @fileoverview Main entry point for utility functions in the Task Management System
 * Implements a centralized barrel pattern for utility function exports with enhanced
 * security features and type safety.
 * @version 1.0.0
 */

// Import all utility functions from individual modules
import * as cryptoUtils from './crypto.util';
import * as dateUtils from './date.util';
import * as errorUtils from './error.util';
import { enhancedLogger } from './logger.util';
import * as validationUtils from './validation.util';

/**
 * Re-export cryptographic utilities with security features
 * @version 1.0.0
 */
export const crypto = {
  hashPassword: cryptoUtils.hashPassword,
  verifyPassword: cryptoUtils.verifyPassword,
  encrypt: cryptoUtils.encrypt,
  decrypt: cryptoUtils.decrypt,
  generateToken: cryptoUtils.generateToken,
  generateHmac: cryptoUtils.generateHmac
} as const;

/**
 * Re-export date manipulation utilities with timezone support
 * @version 1.0.0
 */
export const date = {
  formatDate: dateUtils.formatDate,
  parseDate: dateUtils.parseDate,
  calculateDaysRemaining: dateUtils.calculateDaysRemaining,
  isOverdue: dateUtils.isOverdue,
  addBusinessDays: dateUtils.addBusinessDays
} as const;

/**
 * Re-export error handling utilities with enhanced security tracking
 * @version 1.0.0
 */
export const error = {
  AppError: errorUtils.AppError,
  formatError: errorUtils.formatError,
  createError: errorUtils.createError
} as const;

/**
 * Re-export enhanced logging utilities with security features
 * @version 1.0.0
 */
export const logger = enhancedLogger;

/**
 * Re-export validation utilities with OWASP compliance
 * @version 1.0.0
 */
export const validation = {
  validateUUID: validationUtils.validateUUID,
  validateEmail: validationUtils.validateEmail,
  validateTaskStatus: validationUtils.validateTaskStatus,
  validateProjectStatus: validationUtils.validateProjectStatus,
  validatePriority: validationUtils.validatePriority,
  validateUserRole: validationUtils.validateUserRole,
  validateDate: validationUtils.validateDate,
  sanitizeInput: validationUtils.sanitizeInput
} as const;

/**
 * Default export of all utility functions organized by category
 * Provides a single import point for all utilities while maintaining
 * clear module boundaries and type safety
 */
export default {
  crypto,
  date,
  error,
  logger,
  validation
} as const;
```

This implementation:

1. Follows the barrel pattern for centralized exports while maintaining clear module boundaries.

2. Implements strict type safety using TypeScript's const assertions to prevent modifications.

3. Organizes utilities into logical categories (crypto, date, error, logger, validation) for better code organization.

4. Provides both named exports for individual utility categories and a default export for the complete utility suite.

5. Includes comprehensive JSDoc documentation for better IDE support and code maintainability.

6. Maintains security best practices by:
   - Carefully controlling which functions are exposed
   - Using const assertions to prevent modification of utility objects
   - Maintaining clear module boundaries to prevent circular dependencies
   - Providing type-safe access to all utility functions

7. Addresses all requirements from the technical specification:
   - Code Organization: Implements the barrel pattern for centralized access
   - Modular Architecture: Clear separation of concerns with categorized utilities
   - Security Implementation: Exposes security-critical utilities in a controlled manner
   - System Monitoring: Provides access to logging and error handling utilities

The code can be used in two ways:

1. Import specific utility categories:
```typescript
import { crypto, validation } from '../utils';
// Use specific utilities
await crypto.hashPassword(password);
validation.validateEmail(email);
```

2. Import all utilities:
```typescript
import utils from '../utils';
// Use utilities through categories
await utils.crypto.hashPassword(password);
utils.validation.validateEmail(email);