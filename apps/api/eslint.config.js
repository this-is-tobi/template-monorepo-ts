import eslintConfigBase from '@template-monorepo-ts/eslint-config-base'

export default [
  ...eslintConfigBase,
  {
    files: [
      'src/**/*.{js,cjs,mjs,ts}',
    ],
  }
]
