import eslintConfigBase from '@template-monorepo-ts/eslint-config'

export default eslintConfigBase.append(
  {
    ignores: [
      'apps/**/src',
      'apps/**/prisma',
      'packages/**/src',
    ],
  },
  {
    // k6 scripts run in the Goja runtime and have access to k6-specific globals
    // (`__ENV`, `__VU`, `__ITER`).  Declare them so ESLint stops complaining.
    files: ['packages/k6/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
      },
    },
  },
)
