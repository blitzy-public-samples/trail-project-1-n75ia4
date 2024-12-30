// @jest/types v29.0.0 - Type definitions for Jest configuration
import type { Config } from '@jest/types';

/**
 * Enterprise-grade Jest configuration for backend service testing
 * Implements comprehensive test environment settings with TypeScript support
 * 
 * Features:
 * - TypeScript compilation and module resolution
 * - Extensive code coverage reporting and thresholds
 * - Performance optimizations for test execution
 * - Separate unit and integration test configurations
 * - Custom module path aliases
 * - Global test setup and teardown
 */

const jestConfig: Config.InitialOptions = {
  // Use ts-jest for TypeScript compilation and testing
  preset: 'ts-jest',
  
  // Node.js test environment for backend services
  testEnvironment: 'node',
  
  // Root directories for test discovery
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // Module path aliases for clean imports
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@test/(.*)': '<rootDir>/tests/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1'
  },
  
  // Code coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',           // Console output
    'lcov',           // HTML report
    'json',           // Raw data
    'html',           // Detailed HTML report
    'cobertura'       // CI/CD integration
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/critical/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: true
      }
    ]
  },
  
  // Test setup and configuration files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  
  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__mocks__/'
  ],
  
  // Performance and execution configuration
  verbose: true,
  maxWorkers: '50%',          // Utilize 50% of available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  errorOnDeprecated: true,    // Fail on deprecated Jest features
  testTimeout: 10000,         // 10 second timeout per test
  maxConcurrency: 5,          // Maximum concurrent test files
  detectOpenHandles: true,    // Detect hanging test resources
  forceExit: true            // Force exit after all tests complete
};

/**
 * Returns the fully configured Jest configuration object
 * @returns {Config.InitialOptions} Type-safe Jest configuration
 */
const getConfig = (): Config.InitialOptions => {
  // Apply environment-specific overrides if needed
  if (process.env.CI) {
    return {
      ...jestConfig,
      // CI-specific overrides
      cache: false,
      collectCoverage: true,
      coverageReporters: ['text', 'cobertura'],
      maxWorkers: 2
    };
  }
  
  return jestConfig;
};

// Export the configuration
export default getConfig();