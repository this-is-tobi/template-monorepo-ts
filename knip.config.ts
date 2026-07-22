import type { KnipConfig } from 'knip'

/**
 * knip — finds unused files, dependencies and exports across the monorepo.
 *
 * Most entry points are inferred automatically (knip's default `src/index.ts`
 * plus its vite / vitest / playwright / prisma / lint-staged / commitlint
 * plugins). The config below only adds what those can't infer:
 *
 *   - `eslint.config.js` in every workspace — eslint is provided by the shared
 *     eslint-config package, so it isn't a per-workspace dependency and knip's
 *     eslint plugin doesn't activate to pick the config up as an entry.
 *   - bun-run entry points (api server + seed scripts), the vitepress config
 *     under `src/`, the vendored UI surface, and k6 scenarios run by k6.
 *
 * Unused *exports/types* are warnings, not errors: a template intentionally
 * ships public surfaces (UI components, test helpers) nothing imports yet.
 */
const config: KnipConfig = {
  // tsconfig-only package — no JS/TS for knip to analyse.
  ignoreWorkspaces: ['packages/ts-config'],
  // Run as binaries from scripts but provided by eslint-config / the k6 runtime.
  ignoreBinaries: ['eslint', 'k6'],
  ignoreDependencies: [
    'pino-pretty', // pino transport target, loaded by string (never imported)
    '@prisma/config', // prisma tooling, resolved by the prisma CLI at runtime
    '@prisma/migrate', // prisma tooling, resolved by the prisma CLI at runtime
  ],
  rules: {
    exports: 'warn',
    types: 'warn',
    enumMembers: 'warn',
    duplicates: 'warn',
  },
  workspaces: {
    '.': {
      entry: ['eslint.config.js'],
    },
    'apps/api': {
      // Server bootstrap and seed scripts are invoked outside the import graph.
      entry: ['src/server.ts', 'scripts/*.ts', 'eslint.config.js'],
      ignore: ['prisma/*.prisma'],
    },
    'apps/web': {
      // Vendored shadcn-vue components are a public surface: treat each barrel
      // as an entry so their (currently unused) exports aren't flagged.
      entry: ['public/config.js', 'src/components/ui/**/index.ts', 'eslint.config.js'],
    },
    'apps/mcp': {
      // Binary entry point — nothing imports it, so declare it explicitly.
      entry: ['src/index.ts', 'eslint.config.js'],
    },
    'apps/docs': {
      // vitepress config lives under src/, where knip's plugin doesn't look.
      entry: ['src/.vitepress/config.ts', 'src/.vitepress/theme/index.ts', 'eslint.config.js'],
    },
    'packages/playwright': {
      entry: ['tests/specs/**/*.e2e.ts', 'tests/support/index.ts', 'eslint.config.js'],
      // Wired into the e2e turbo build graph and available to specs, but the
      // starter suite doesn't import them yet.
      ignoreDependencies: ['@template-monorepo-ts/shared', '@template-monorepo-ts/test-utils'],
    },
    'packages/k6': {
      // k6 executes each scenario directly and provides `k6*` as built-in
      // modules resolved by its own runtime, not from node_modules.
      entry: ['scenarios/**/*.js'],
      project: '**/*.js',
      ignoreDependencies: [/^k6(\/.*)?$/],
    },
    'packages/cli': {
      // Binary entry point — nothing imports it, so declare it explicitly.
      entry: ['src/index.ts', 'eslint.config.js'],
    },
    // eslint-config depends on eslint directly, so knip's eslint plugin already
    // picks up its config — use defaults to avoid a redundant-entry warning.
    'packages/eslint-config': {},
    'packages/*': {
      entry: ['eslint.config.js'],
    },
  },
}

export default config
