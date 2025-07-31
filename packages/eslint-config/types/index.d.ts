import antfu from '@antfu/eslint-config'

declare module '@template-monorepo-ts/eslint-config' {
  const config: ReturnType<typeof antfu>;
}
