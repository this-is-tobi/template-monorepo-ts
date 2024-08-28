import eslintConfigBase from '@template-monorepo-ts/eslint-config'

export default eslintConfigBase.append({
  ignores: ['src/prisma/migrations']
})
