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
})
