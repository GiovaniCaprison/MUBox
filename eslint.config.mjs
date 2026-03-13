import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import { rules as reactHooksRules } from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Enables the recommended default ESLint rules
  eslint.configs.recommended,

  // Enables all of the strict linting settings including rules that require type information and customizes them
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // Required to enable typed linting
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Customizes the rules to match our code style
    rules: {
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }], // We often use these in forEach functions in arrow shorthand format
      // Enacts our team's naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'memberLike', format: null }, // We often do not get to control casing of members given they are enforced via external types so this disables checking for members
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowBoolean: true, allowNumber: true }], // Allows booleans/numbers which can safely be included in string templates
    },
  },

  // Enables import plugin rules and customizes them
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    // Enables resolution for the import plugin rules
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true, // Always try to resolve types under in the @types directory. Required for resolving things like "aws-lambda" which lives at "@types/aws-lambda"
        },
        node: true,
      },
    },
    // Adds additional rules we have found valuable but are not enabled by default
    rules: {
      'import/first': 'error', // Ensures imports occur at the start of files
      'import/no-absolute-path': 'error', // Ensures that we do not import from any absolute paths
      // 'import/no-cycle': ['error', { ignoreExternal: true }], // Ensures we do not introduce circular dependencies which can cause compilers/minifiers/bundlers to blow up in strange ways. This should be eventually be enabled once we have fixed our circular dependencies.
      'import/no-deprecated': 'error', // Helps prevent us from importing deprecated dependencies
      'import/no-extraneous-dependencies': ['error', { packageDir: ['./', '../../'] }], // Ensures we do not use transitive dependencies
      'import/no-mutable-exports': 'error', // Ensures no mutable variables are exported
      'import/no-unassigned-import': 'error', // Helps avoid side effects of unassigned imports
      'import/no-useless-path-segments': ['error', { noUselessIndex: true }], // Ensures we do not have any useless paths in our relative imports
      // Require ordered imports
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc' },
          groups: [
            ['builtin', 'external'],
            ['index', 'sibling', 'parent', 'internal'],
          ],
          'newlines-between': 'always',
          pathGroupsExcludedImportTypes: [],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            // Ensures we do not import directly from aws-cdk-lib given it slows down our builds
            { name: 'aws-cdk-lib', message: 'Use sub-module imports like "aws-cdk-lib/core" instead' },
          ],
        },
      ],
    },
  },

  // Enables accessibility linting.
  jsxA11y.flatConfigs.strict,

  // Enables React linting configuration and applies other customizations for React files.
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    plugins: { 'react-hooks': { rules: reactHooksRules } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    settings: {
      react: {
        version: 'detect', // Tells the React rules to auto-detect the React version being used.
      }
    }
  },
  {
    files: ['**/*.tsx'],
    rules: {
      // Components must start with a capital letter so we allow PascalCase variables here
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'memberLike', format: null },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
      ],
    },
  },

  // Enables Storybook linting
  storybook.configs["flat/recommended"],

  // Disables all rules that would conflict with Prettier
  eslintConfigPrettier,

  // Ensures our generated artifacts are ignored
  { ignores: ['**/coverage/', '**/dist/'] },
);
