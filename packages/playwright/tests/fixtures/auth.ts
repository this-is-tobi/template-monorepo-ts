import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import { env } from '~/tests/env.js'
import { LoginPage } from '~/tests/pages/login.page.js'

/**
 * Extended test fixture that provides an authenticated page.
 * Usage: `import { test, expect } from '~/tests/fixtures/auth.js'`
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(env.testAdminEmail, env.testAdminPassword)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await use(page)
  },
})

export { expect } from '@playwright/test'
