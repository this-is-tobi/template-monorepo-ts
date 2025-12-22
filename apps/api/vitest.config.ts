/// <reference types="vitest" />
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    environment: 'node',
    testTimeout: 2000,
    watch: false,
    globals: true,
    setupFiles: ['./vitest-init.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*'],
      exclude: [
        ...configDefaults.exclude,
        '**/__*__/*',
        '**/*.spec.ts',
        '**/types.ts',
        '**/generated/**',
      ],
    },
    include: ['src/**/*.spec.ts'],
    exclude: [...configDefaults.exclude],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
})
