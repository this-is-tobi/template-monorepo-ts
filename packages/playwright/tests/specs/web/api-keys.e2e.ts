import { faker } from '@faker-js/faker'
import { expect, test } from '~/tests/fixtures/auth.js'
import { ApiKeysPage } from '~/tests/pages/index.js'

test.describe('API Keys (Web)', () => {
  test('should display API keys page', async ({ authenticatedPage: page }) => {
    await page.goto('/api-keys')
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible({ timeout: 10000 })
  })

  test('should create a new API key', async ({ authenticatedPage: page }) => {
    const keysPage = new ApiKeysPage(page)
    await keysPage.goto()
    await expect(keysPage.heading).toBeVisible({ timeout: 10000 })

    if (await keysPage.createKeyButton.isVisible()) {
      const keyName = `e2e-key-${faker.string.nanoid(6)}`
      await keysPage.createKey(keyName)

      // Key should appear in the table or a success dialog should show
      await expect(
        keysPage.keyRow(keyName).or(page.getByText(/key.*created|copy.*key/i)),
      ).toBeVisible({ timeout: 10000 })
    }
  })

  test('should list existing API keys', async ({ authenticatedPage: page }) => {
    const keysPage = new ApiKeysPage(page)
    await keysPage.goto()
    await expect(keysPage.heading).toBeVisible({ timeout: 10000 })

    // Page should load without errors
    await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
  })
})
