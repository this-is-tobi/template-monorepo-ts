import type { Locator, Page } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly heading: Locator
  readonly welcomeMessage: Locator
  readonly projectCount: Locator
  readonly viewProjectsButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Dashboard' })
    this.welcomeMessage = page.locator('text=Welcome back')
    this.projectCount = page.locator('.text-2xl').first()
    this.viewProjectsButton = page.getByRole('button', { name: /view all projects/i })
  }

  async goto() {
    await this.page.goto('/')
  }
}
