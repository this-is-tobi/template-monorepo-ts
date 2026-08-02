import { expect, test } from '~/tests/fixtures/auth.js'

test.describe('Settings', () => {
  async function navigateToSettings(page: import('@playwright/test').Page) {
    await page.getByRole('link', { name: /settings/i }).click()
    await page.waitForURL('**/settings/**')
    await expect(page.getByRole('heading', { name: /general/i })).toBeVisible()
  }

  test('should display the platform configuration form', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await expect(page.getByLabel('Application name')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Quotas' })).toBeVisible()
  })

  test('should keep save disabled until something changes', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)
    await expect(page.getByLabel('Application name')).toBeVisible({ timeout: 10000 })

    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await page.getByLabel('Application name').fill('Edited name')
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled()

    // Leave it as it was for the rest of the suite.
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  test('should show version information and service status under System', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/system')
    await expect(page.getByRole('heading', { name: 'Versions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Service status' })).toBeVisible()
    await expect(page.getByText(/Healthy|Degraded|Checking/).first()).toBeVisible({ timeout: 10000 })
  })

  test('should introspect the resolved server configuration', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/system')
    await expect(page.getByRole('heading', { name: 'Runtime configuration' })).toBeVisible({ timeout: 10000 })

    // Every option is listed by the env var that sets it...
    await expect(page.getByText('SERVER__PORT').first()).toBeVisible()
    // ...and secrets are redacted server-side, never rendered.
    await expect(page.getByText('AUTH__SECRET').first()).toBeVisible()
    await expect(page.getByText(/change-me-in-production/)).toHaveCount(0)
  })

  test('should navigate to theme settings', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    // Settings sub-nav items appear in the sidebar
    await page.getByRole('link', { name: /theme/i }).click()
    await page.waitForURL('**/settings/theme')
    await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible()
  })

  test('should navigate to system settings', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await page.getByRole('link', { name: 'System', exact: true }).click()
    await page.waitForURL('**/settings/system')
    await expect(page.getByRole('heading', { name: 'System', exact: true })).toBeVisible()
  })

  test('theme settings shows color palette options', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/theme')
    await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible()
    // Theme settings renders color palette selectors
    await expect(page.getByRole('heading', { name: /colors/i })).toBeVisible({ timeout: 10000 })
  })

  test('theme preview reverts when leaving without saving', async ({ authenticatedPage: page }) => {
    // Previewing writes onto :root, which styles the whole app — an unsaved
    // preview must not follow the user to other pages.
    await page.goto('/settings/theme')
    await expect(page.getByRole('heading', { name: /colors/i })).toBeVisible({ timeout: 10000 })

    const before = await page.evaluate(() => document.documentElement.style.getPropertyValue('--primary-500'))
    await page.getByRole('radio', { name: 'rose' }).first().click()
    await expect(page.getByText('Previewing unsaved changes')).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).click()
    await page.waitForURL(url => !url.pathname.startsWith('/settings/theme'))

    const after = await page.evaluate(() => document.documentElement.style.getPropertyValue('--primary-500'))
    expect(after).toBe(before)
  })

  test('settings sidebar shows admin section links', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    // Admin section links should be visible in the sidebar
    await expect(page.getByRole('link', { name: 'All users' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'All organizations' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'All API keys' })).toBeVisible()
  })

  test('should navigate to admin users via settings sidebar', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await page.getByRole('link', { name: 'All users' }).click()
    await page.waitForURL('**/settings/admin/users')
    await expect(page.getByRole('heading', { name: /all users/i })).toBeVisible()
  })

  test('should navigate to admin organizations via settings sidebar', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await page.getByRole('link', { name: 'All organizations' }).click()
    await page.waitForURL('**/settings/admin/organizations')
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible()
  })
})
