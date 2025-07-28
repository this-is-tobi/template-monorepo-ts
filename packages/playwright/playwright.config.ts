import { defineConfig, devices } from '@playwright/test'

// Host and port config
const apiHost = process.env.API_HOST || 'localhost'
const apiPort = process.env.API_PORT || '8081'
const docsHost = process.env.DOCS_HOST || 'localhost'
const docsPort = process.env.DOCS_PORT || '8082'

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/specs',
  snapshotDir: './tests/snapshots',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    headless: true,
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
  },
  projects: [
    // API Projects
    {
      name: 'chromium-api',
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${apiHost}:${apiPort}`,
      },
    },
    {
      name: 'firefox-api',
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        baseURL: `http://${apiHost}:${apiPort}`,
      },
    },
    {
      name: 'webkit-api',
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        baseURL: `http://${apiHost}:${apiPort}`,
      },
    },

    // Docs Projects
    {
      name: 'chromium-docs',
      testMatch: /docs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${docsHost}:${docsPort}`,
      },
    },
    {
      name: 'firefox-docs',
      testMatch: /docs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        baseURL: `http://${docsHost}:${docsPort}`,
      },
    },
    {
      name: 'webkit-docs',
      testMatch: /docs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        baseURL: `http://${docsHost}:${docsPort}`,
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'cd ../.. && bun run start',
  //   url: 'http://localhost:8081/healthz',
  //   reuseExistingServer: !process.env.CI,
  // },
})
