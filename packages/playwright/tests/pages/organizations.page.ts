import type { Locator, Page } from '@playwright/test'

export class OrganizationsPage {
  readonly page: Page
  readonly heading: Locator
  readonly createOrgButton: Locator
  readonly createDialog: Locator
  readonly orgTable: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Organizations' })
    this.createOrgButton = page.getByRole('button', { name: /new organization|create/i })
    this.createDialog = page.locator('[role="dialog"]').filter({ hasText: /create.*organization|new.*organization/i })
    this.orgTable = page.locator('.p-datatable')
  }

  async goto() {
    await this.page.goto('/organizations')
  }

  async createOrganization(name: string, slug?: string) {
    await this.createOrgButton.click()
    await this.createDialog.waitFor({ state: 'visible' })
    await this.createDialog.getByLabel('Name').fill(name)
    if (slug) {
      const slugInput = this.createDialog.getByLabel('Slug')
      await slugInput.clear()
      await slugInput.fill(slug)
    }
    await this.createDialog.getByRole('button', { name: /create/i }).click()
  }

  orgRow(name: string) {
    return this.page.locator('tr').filter({ hasText: name })
  }
}
