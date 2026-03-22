import { expect, test } from '@playwright/test'
import { env } from '~/tests/env.js'
import { LoginPage, RegisterPage } from '~/tests/pages/index.js'

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()
  })

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(env.testAdminEmail, env.testAdminPassword)

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('invalid@example.com', 'wrongpassword')

    await expect(loginPage.errorMessage).toBeVisible()
  })

  test('should navigate to register page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Only visible if registration is enabled
    const registerLink = loginPage.registerLink
    if (await registerLink.isVisible()) {
      await registerLink.click()
      await expect(page).toHaveURL(/\/register/)
    }
  })

  test('should display register form', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // Registration may redirect to /login if disabled, or show the form
    const createAccountText = page.getByText('Create an account')
    const signInText = page.getByText('Enter your credentials')
    await expect(createAccountText.or(signInText)).toBeVisible()

    if (await createAccountText.isVisible()) {
      await expect(registerPage.submitButton).toBeVisible()
    }
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Enter your credentials')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(env.testAdminEmail, env.testAdminPassword)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Open user menu popover
    await page.getByRole('button', { name: 'User menu' }).click()

    // Click sign out
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
