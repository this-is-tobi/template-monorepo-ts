import { expect, test } from '@playwright/test'
import { env } from '~/tests/env.js'
import { generateUser } from '~/tests/helpers/factories.js'
import {
  BASE_URL,
  getSession,
  listOrganizations,
  signIn,
  signOut,
  signUp,
} from '~/tests/helpers/index.js'

test.describe('Auth API', () => {
  test('sign up creates a new user', async ({ request }) => {
    const user = generateUser()
    const res = await signUp(request, user)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.user?.email).toBe(user.email)
  })

  test('sign in with valid credentials returns session', async ({ request }) => {
    const res = await signIn(request, env.testAdminEmail, env.testAdminPassword)
    expect(res.ok()).toBe(true)
  })

  test('sign in with wrong password returns 401', async ({ request }) => {
    const res = await signIn(request, env.testAdminEmail, 'wrong-password-123')
    expect(res.ok()).toBe(false)
  })

  test('get session when authenticated returns user data', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signIn(ctx, env.testAdminEmail, env.testAdminPassword)
    const res = await getSession(ctx)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.user?.email).toBe(env.testAdminEmail)
    expect(body.session?.token).toBeTruthy()
    await ctx.dispose()
  })

  test('get session when unauthenticated returns null', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    const res = await getSession(ctx)
    // BetterAuth returns 200 with null body for unauthenticated
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
    await ctx.dispose()
  })

  test('sign out invalidates session', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signIn(ctx, env.testAdminEmail, env.testAdminPassword)

    const sessionBefore = await getSession(ctx)
    expect(sessionBefore.ok()).toBe(true)
    const beforeBody = await sessionBefore.json()
    expect(beforeBody?.session).toBeTruthy()

    await signOut(ctx)

    const sessionAfter = await getSession(ctx)
    const afterBody = await sessionAfter.json()
    expect(afterBody).toBeNull()
    await ctx.dispose()
  })

  test('sign up with duplicate email fails', async ({ request }) => {
    const user = generateUser()
    const first = await signUp(request, user)
    expect(first.ok()).toBe(true)

    const second = await signUp(request, user)
    expect(second.ok()).toBe(false)
  })

  test('new user gets a personal organization', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    const user = generateUser()
    await signUp(ctx, user)
    await signIn(ctx, user.email, user.password)

    const orgsRes = await listOrganizations(ctx)
    expect(orgsRes.ok()).toBe(true)

    const orgs = await orgsRes.json()
    expect(orgs.length).toBeGreaterThanOrEqual(1)
    await ctx.dispose()
  })
})
