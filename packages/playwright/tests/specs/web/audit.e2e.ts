import { expect, test } from '~/tests/fixtures/auth.js'

test.describe('Audit (Web)', () => {
  test('should display audit page in admin settings', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/audit')
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible()
  })

  test('should show audit log entries', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/audit')
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible()

    // Wait for data to load — the audit page always renders a DataTable
    await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
  })

  test('admin settings shows audit link', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/general')
    await expect(page.getByRole('heading', { name: /general/i })).toBeVisible()

    const auditLink = page.getByRole('link', { name: /audit/i })
    await expect(auditLink).toBeVisible()

    await auditLink.click()
    await page.waitForURL('**/settings/audit')
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible()
  })
})
