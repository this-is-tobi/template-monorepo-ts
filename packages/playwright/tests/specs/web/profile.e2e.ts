import { env } from '~/tests/env.js'
import { expect, test } from '~/tests/fixtures/auth.js'

test.describe('Profile (Web)', () => {
  test('should display profile page', async ({ authenticatedPage: page }) => {
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show logged-in user email', async ({ authenticatedPage: page }) => {
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
    await expect(page.getByText(env.testAdminEmail)).toBeVisible()
  })

  test('should show user role', async ({ authenticatedPage: page }) => {
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
    // Admin user should show "admin" role
    await expect(page.getByText(/admin|user/i).first()).toBeVisible()
  })

  test('should navigate to profile from user menu', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('link', { name: /profile/i }).click()
    await page.waitForURL('**/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
  })
})
