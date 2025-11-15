import eslintConfigBase from '@template-monorepo-ts/eslint-config'

export default eslintConfigBase.append({
  ignores: [
    'apps/**/src',
    'apps/**/prisma',
    'packages/**/src',
  ],
})
