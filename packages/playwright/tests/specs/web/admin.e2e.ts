import { expect, test } from '~/tests/fixtures/auth.js'

test.describe('Admin Pages (Web)', () => {
  // -- Users --

  test('should display admin users page', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/users')
    await expect(page.getByRole('heading', { name: /all users/i })).toBeVisible({ timeout: 10000 })
  })

  test('admin users page shows datatable', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/users')
    await expect(page.getByRole('heading', { name: /all users/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
  })

  test('admin users page has search filter', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/users')
    await expect(page.getByRole('heading', { name: /all users/i })).toBeVisible({ timeout: 10000 })
    // Search input should be present
    await expect(page.getByLabel('Search')).toBeVisible()
  })

  test('should navigate to user detail from users page', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/users')
    await expect(page.getByRole('heading', { name: /all users/i })).toBeVisible({ timeout: 10000 })

    // Click first user row to navigate to detail
    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForURL('**/settings/admin/users/*')
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })

  // -- User Detail --

  test('admin user detail shows back button', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/users')
    await expect(page.getByRole('heading', { name: /all users/i })).toBeVisible({ timeout: 10000 })

    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForURL('**/settings/admin/users/*')
      await expect(page.getByRole('button', { name: /all users/i })).toBeVisible()
    }
  })

  // -- Admin Organizations --

  test('should display admin organizations page', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/organizations')
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible({ timeout: 10000 })
  })

  test('admin organizations page shows datatable', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/organizations')
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to admin org detail', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/organizations')
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible({ timeout: 10000 })

    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      // Personal org redirects to user detail, non-personal shows org detail
      await page.waitForURL(/\/(settings\/admin\/organizations\/|settings\/admin\/users\/)/)
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })

  // -- Admin Projects --

  test('should display admin projects page', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 10000 })
  })

  test('admin projects page shows datatable', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to admin project detail', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 10000 })

    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForURL('**/settings/admin/projects/*')
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })

  test('admin project detail shows back button', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 10000 })

    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForURL('**/settings/admin/projects/*')
      await expect(page.getByRole('button', { name: /all projects/i })).toBeVisible()
    }
  })

  // -- Admin API Keys --

  test('should display admin api keys page', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/api-keys')
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible({ timeout: 10000 })
  })

  test('admin api keys page shows datatable', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/api-keys')
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to admin api key detail', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/admin/api-keys')
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible({ timeout: 10000 })

    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForURL('**/settings/admin/api-keys/*')
      // Detail page has tabs
      await expect(page.locator('[role="tab"]').first()).toBeVisible()
    }
  })

  // -- API Key Detail (user mode) --

  test('api key detail shows details tab', async ({ authenticatedPage: page }) => {
    await page.goto('/api-keys')
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible({ timeout: 10000 })

    const firstLink = page.locator('tr').first().getByRole('link').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForURL('**/api-keys/*')
      await expect(page.locator('[role="tab"]', { hasText: /details/i })).toBeVisible()
      await expect(page.locator('[role="tab"]', { hasText: /permissions/i })).toBeVisible()
    }
  })
})
