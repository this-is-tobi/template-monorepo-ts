import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 5000,
    watch: false,
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['src/**/*'],
      exclude: ['src/**/*.spec.ts'],
    },
  },
})
