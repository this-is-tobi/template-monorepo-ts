// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  stylistic: {
    overrides: {
      'style/comma-dangle': ['error', 'always-multiline'],
      'style/quote-props': ['error', 'as-needed', { keywords: false, unnecessary: true }],
      'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'style/max-statements-per-line': ['error', { max: 2 }],
      'no-console': ['error', { allow: ['**/*.spec.ts'] }],
      'jsonc/sort-keys': 'off',
      'node/prefer-global/process': ['error', 'always'],
      'node/prefer-global/console': ['error', 'always'],
      'yaml/quotes': ['error', { prefer: 'double' }],
      'unused-imports/no-unused-vars': ['error', { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
  yaml: {
    overrides: {
      'yaml/quotes': ['error', { prefer: 'double' }],
      'yaml/indent': ['error', 2, { indentBlockSequences: false }],
    },
  },
  ignores: [
    '**/node_modules',
    '**/.turbo',
    'helm/templates',
    '**/tsconfig.base.json',
    '**/tsconfig.json',
  ],
})
