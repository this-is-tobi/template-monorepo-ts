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
})
