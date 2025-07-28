import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Export the testing APIs
export { expect, test }

// Helper functions for e2e tests
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

export async function checkHeading(page: Page, text: string): Promise<void> {
  const heading = page.getByRole('heading', { name: text })
  await expect(heading).toBeVisible()
}

export async function checkApiHealth(request: APIRequestContext) {
  const response = await request.get('/api/v1/healthz')
  expect(response.status()).toBe(200)
  return response
}
