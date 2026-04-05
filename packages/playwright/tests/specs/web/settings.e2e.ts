import { expect, test } from '~/tests/fixtures/auth.js'

test.describe('Settings', () => {
  async function navigateToSettings(page: import('@playwright/test').Page) {
    await page.getByRole('link', { name: /settings/i }).click()
    await page.waitForURL('**/settings/**')
    await expect(page.getByRole('heading', { name: /general/i })).toBeVisible()
  }

  test('should display general settings', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await expect(page.getByRole('heading', { name: 'Versions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Service status' })).toBeVisible()
  })

  test('should show version information', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await expect(page.getByText('Web').first()).toBeVisible()
    await expect(page.getByText('API').first()).toBeVisible()
  })

  test('should show service status indicators', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    // Wait for status checks to complete
    await expect(page.getByText(/Healthy|Degraded|Checking/).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Reachable|Unreachable|Checking/).first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to theme settings', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    // Settings sub-nav items appear in the sidebar
    await page.getByRole('link', { name: /theme/i }).click()
    await page.waitForURL('**/settings/theme')
    await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible()
  })

  test('should navigate to config settings', async ({ authenticatedPage: page }) => {
    await navigateToSettings(page)

    await page.getByRole('link', { name: /configuration/i }).click()
    await page.waitForURL('**/settings/config')
    await expect(page.getByRole('heading', { name: /configuration/i })).toBeVisible()
  })

  test('theme settings shows color palette options', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/theme')
    await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible()
    // Theme settings renders color palette selectors
    await expect(page.getByRole('heading', { name: /colors/i })).toBeVisible({ timeout: 10000 })
  })

  test('config settings shows form fields', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/config')
    await expect(page.getByRole('heading', { name: /configuration/i })).toBeVisible()
    // Config page should show form fields
    await expect(page.getByLabel('Application name')).toBeVisible({ timeout: 10000 })
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
