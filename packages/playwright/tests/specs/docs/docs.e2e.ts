import { expect, test } from '@playwright/test'
import { env } from '~/tests/env.js'

test('Docs homepage loads', async ({ page }) => {
  // Navigate to the docs homepage
  await page.goto(`http://${env.docsHost}:${env.docsPort}`)

  // Verify the page loads successfully by checking for the app div
  const appDiv = page.locator('#app')
  await expect(appDiv).toBeVisible()

  // Verify we have a proper HTML document
  const htmlElement = page.locator('html')
  await expect(htmlElement).toBeVisible()
})
