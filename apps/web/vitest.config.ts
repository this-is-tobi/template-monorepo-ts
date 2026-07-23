import { fileURLToPath } from 'node:url'
/// <reference types="vitest" />
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    testTimeout: 5000,
    watch: false,
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./vitest-init.ts'],
    // happy-dom's localStorage delegates to Bun's native Web Storage API,
    // which prints an ExperimentalWarning on first access unless a backing
    // file is configured — harmless here since nothing needs persistence
    // across test runs, so silence it instead of chasing a file path.
    env: {
      NODE_NO_WARNINGS: '1',
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['src/**/*'],
      exclude: [
        'src/**/*.spec.ts',
        // Entry points with no business logic — covered by E2E
        'src/main.ts',
        'src/App.vue',
      ],
    },
  },
})
