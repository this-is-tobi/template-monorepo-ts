import type { Locator, Page } from '@playwright/test'

export class ApiKeysPage {
  readonly page: Page
  readonly heading: Locator
  readonly createKeyButton: Locator
  readonly createDialog: Locator
  readonly keysTable: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /api keys/i })
    this.createKeyButton = page.getByRole('button', { name: /new.*key|create.*key/i })
    this.createDialog = page.locator('[role="dialog"]').filter({ hasText: /create.*key|new.*key/i })
    this.keysTable = page.locator('.p-datatable')
  }

  async goto() {
    await this.page.goto('/api-keys')
  }

  async createKey(name: string) {
    await this.createKeyButton.click()
    await this.createDialog.waitFor({ state: 'visible' })
    await this.createDialog.getByLabel('Name').fill(name)
    await this.createDialog.getByRole('button', { name: /create/i }).click()
  }

  keyRow(name: string) {
    return this.page.locator('tr').filter({ hasText: name })
  }
}
