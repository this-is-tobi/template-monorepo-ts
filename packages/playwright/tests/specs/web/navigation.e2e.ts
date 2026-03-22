import { env } from '~/tests/env.js'
import { expect, test } from '~/tests/fixtures/auth.js'
import { DashboardPage } from '~/tests/pages/index.js'

test.describe('Navigation', () => {
  test('should display dashboard after login', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await expect(dashboard.heading).toBeVisible()
    await expect(dashboard.welcomeMessage).toBeVisible()
  })

  test('should navigate to projects page', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await page.waitForURL('**/projects')
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  })

  test('should navigate to profile page', async ({ authenticatedPage: page }) => {
    // Profile link is inside the user menu popover
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('link', { name: /profile/i }).click()
    await page.waitForURL('**/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
  })

  test('should navigate to settings page', async ({ authenticatedPage: page }) => {
    const settingsLink = page.getByRole('link', { name: /settings/i })
    await settingsLink.click()
    await page.waitForURL('**/settings/**')
    await expect(page.getByRole('heading', { name: /general/i })).toBeVisible()
  })

  test('should show project count on dashboard', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await expect(dashboard.heading).toBeVisible()
    // Project count card should be visible
    await expect(page.getByRole('button', { name: 'View all projects' })).toBeVisible()
  })

  test('should show user email on dashboard', async ({ authenticatedPage: page }) => {
    await expect(page.getByText(env.testAdminEmail)).toBeVisible()
  })
})
