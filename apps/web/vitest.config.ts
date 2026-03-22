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
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['src/**/*'],
      exclude: [
        'src/**/*.spec.ts',
      ],
    },
  },
})
