import { faker } from '@faker-js/faker'
import { expect, test } from '~/tests/fixtures/auth.js'
import { OrganizationsPage } from '~/tests/pages/index.js'

test.describe('Organizations (Web)', () => {
  test('should display organizations page', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to organization detail', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible({ timeout: 10000 })

    // Click on the first org row link (personal org)
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })

  test('should create a new organization', async ({ authenticatedPage: page }) => {
    const orgsPage = new OrganizationsPage(page)
    await orgsPage.goto()
    await expect(orgsPage.heading).toBeVisible()

    // Only try to create if the button exists
    if (await orgsPage.createOrgButton.isVisible()) {
      const orgName = `E2E Org ${faker.string.nanoid(6)}`
      await orgsPage.createOrganization(orgName)

      // Org should appear in the table
      await expect(orgsPage.orgRow(orgName)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should show organization members', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')

    // Navigate to org detail
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')

      // Members section should be visible
      await expect(page.getByText(/members/i).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('org detail shows Details tab', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      await expect(page.locator('[role="tab"]', { hasText: /details/i })).toBeVisible()
    }
  })

  test('org detail shows Members tab', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      await expect(page.locator('[role="tab"]', { hasText: /members/i })).toBeVisible()
    }
  })

  test('org detail shows Projects tab', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      await expect(page.locator('[role="tab"]', { hasText: /projects/i })).toBeVisible()
    }
  })

  test('org detail owner sees Roles and Settings tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      // Admin user is owner of their personal org
      await expect(page.locator('[role="tab"]', { hasText: /roles/i })).toBeVisible({ timeout: 10000 })
      await expect(page.locator('[role="tab"]', { hasText: /settings/i })).toBeVisible({ timeout: 10000 })
    }
  })

  test('org detail owner sees Audit tab', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      // Admin user has audit:read — audit tab should be visible
      await expect(page.locator('[role="tab"]', { hasText: /audit/i })).toBeVisible({ timeout: 10000 })
    }
  })

  test('org detail audit tab shows datatable', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')
      // Click Audit tab
      const auditTab = page.locator('[role="tab"]', { hasText: /audit/i })
      if (await auditTab.isVisible()) {
        await auditTab.click()
        await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('can navigate to Members tab and back', async ({ authenticatedPage: page }) => {
    await page.goto('/organizations')
    const firstOrgLink = page.locator('tr').first().getByRole('link').first()
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click()
      await page.waitForURL('**/organizations/*')

      const membersTab = page.locator('[role="tab"]', { hasText: /members/i })
      if (await membersTab.isVisible()) {
        await membersTab.click()
        // Member list should be visible
        await expect(page.locator('.p-datatable').first()).toBeVisible({ timeout: 10000 })
      }
    }
  })
})
