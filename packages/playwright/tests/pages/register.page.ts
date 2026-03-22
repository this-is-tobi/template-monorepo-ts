import type { Locator, Page } from '@playwright/test'

export class RegisterPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator
  readonly signInLink: Locator
  readonly disabledWarning: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.getByLabel('Name')
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: /create account/i })
    this.errorMessage = page.locator('[data-p-severity="error"]')
    this.signInLink = page.getByRole('link', { name: /sign in/i })
    this.disabledWarning = page.locator('[data-p-severity="warn"]')
  }

  async goto() {
    await this.page.goto('/register')
  }

  async register(name: string, email: string, password: string) {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
