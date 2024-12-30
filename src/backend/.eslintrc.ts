// ESLint configuration for enterprise-grade TypeScript backend service
// @typescript-eslint/eslint-plugin ^6.0.0
// @typescript-eslint/parser ^6.0.0
// eslint-config-prettier ^9.0.0
// eslint-plugin-import ^2.28.0
// eslint-plugin-jest ^27.2.0

export = {
  root: true,
  
  // TypeScript parser configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    tsconfigRootDir: '.',
  },

  // Essential plugins for enterprise TypeScript development
  plugins: [
    '@typescript-eslint',
    'import',
    'jest'
  ],

  // Extended configurations for comprehensive rule sets
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:jest/recommended',
    'prettier' // Must be last to override other formatting rules
  ],

  // Environment configuration
  env: {
    node: true,
    jest: true,
    es2022: true
  },

  // Detailed rule configurations for enterprise-grade code quality
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',

    // Import/Export rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc'
      }
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-duplicates': 'error',

    // Jest testing rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/valid-expect': 'error',
    'jest/no-identical-title': 'error',

    // General code quality rules
    'no-console': ['error', {
      allow: ['warn', 'error']
    }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off' // Turned off in favor of @typescript-eslint/no-unused-vars
  },

  // Settings for import resolution
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    }
  },

  // Patterns to ignore during linting
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    '**/*.js'
  ]
};