import type { APIRequestContext } from '@playwright/test'
import { test as base, expect } from '@playwright/test'
import { env } from '~/tests/env.js'
import { apiUrl } from '~/tests/helpers/api-client.js'

/**
 * Fixture that provides an APIRequestContext pre-authenticated as the admin user.
 * Cookies are automatically managed — subsequent calls are authenticated.
 */
export const test = base.extend<{ adminApi: APIRequestContext }>({
  adminApi: async ({ playwright }, use) => {
    const baseURL = `http://${env.apiHost}:${env.apiPort}`
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: baseURL },
    })
    const res = await ctx.post(apiUrl('/auth/sign-in/email'), {
      data: { email: env.testAdminEmail, password: env.testAdminPassword },
    })
    expect(res.ok(), `Admin sign-in failed: ${res.status()}`).toBe(true)
    await use(ctx)
    await ctx.dispose()
  },
})

export { expect } from '@playwright/test'
