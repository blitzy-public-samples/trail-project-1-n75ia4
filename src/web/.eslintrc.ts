// ESLint configuration for enterprise-grade React/TypeScript application
// Version compatibility:
// - eslint ^8.0.0
// - @typescript-eslint/parser ^6.0.0
// - @typescript-eslint/eslint-plugin ^6.0.0
// - eslint-plugin-react ^7.33.0
// - eslint-plugin-react-hooks ^4.6.0
// - eslint-config-prettier ^9.0.0

export default {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },

  settings: {
    react: {
      version: 'detect',
    },
  },

  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },

  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to override other configs
  ],

  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
    }],
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // React-specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off', // TypeScript handles prop validation
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': ['error', { 
      checkFragmentShorthand: true,
    }],
    'react/jsx-no-useless-fragment': 'error',
    'react/no-array-index-key': 'error',
    'react/no-danger': 'error',

    // General JavaScript/ES6+ rules
    'no-console': ['warn', { 
      allow: ['warn', 'error'],
    }],
    'eqeqeq': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-return-await': 'error',
    'prefer-template': 'error',
    'require-await': 'error',
    'no-shadow': 'error',
    'no-throw-literal': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
  },

  overrides: [
    // Test file specific rules
    {
      files: ['*.test.ts', '*.test.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // Configuration files
    {
      files: ['*.config.ts', 'vite.config.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],

  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    'vite.config.ts',
  ],
};