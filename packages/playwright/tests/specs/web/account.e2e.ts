import { env } from '~/tests/env.js'
import { expect, test } from '~/tests/fixtures/auth.js'

test.describe('Account (Web)', () => {
  test('should display the account profile section', async ({ authenticatedPage: page }) => {
    await page.goto('/account/profile')
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  })

  test('should show logged-in user email', async ({ authenticatedPage: page }) => {
    await page.goto('/account/profile')
    await expect(page.getByText(env.testAdminEmail).first()).toBeVisible()
  })

  test('should show user role', async ({ authenticatedPage: page }) => {
    await page.goto('/account/profile')
    await expect(page.getByText(/admin|user/i).first()).toBeVisible()
  })

  test('should redirect the bare /account path to the profile section', async ({ authenticatedPage: page }) => {
    await page.goto('/account')
    await page.waitForURL('**/account/profile')
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  })

  test('should switch to the security section', async ({ authenticatedPage: page }) => {
    await page.goto('/account/profile')
    await page.getByRole('link', { name: 'Security' }).click()
    await page.waitForURL('**/account/security')

    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /two-factor authentication/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /active sessions/i })).toBeVisible()
  })

  test('should list the session running this test', async ({ authenticatedPage: page }) => {
    await page.goto('/account/security')
    await expect(page.getByRole('button', { name: 'Revoke' }).first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to the account from the user menu', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('link', { name: /account/i }).click()
    await page.waitForURL('**/account/**')
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
  })
})
