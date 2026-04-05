import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateOrganization, generateUser } from '~/tests/helpers/factories.js'
import {
  BASE_URL,
  createApiKey,
  createOrganization,
  getAdminApiKeyById,
  getAdminApiKeys,
  getAdminOrganizationById,
  getAdminOrganizations,
  getAdminUserById,
  signIn,
  signUp,
} from '~/tests/helpers/index.js'

test.describe('Admin API', () => {
  test('admin can list all organizations', async ({ adminApi }) => {
    const res = await getAdminOrganizations(adminApi)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  test('admin can filter organizations', async ({ adminApi }) => {
    const org = generateOrganization()
    await createOrganization(adminApi, org)

    const res = await getAdminOrganizations(adminApi, { searchValue: org.name })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.some((o: Record<string, unknown>) => o.name === org.name)).toBe(true)
  })

  test('admin can get organization by id', async ({ adminApi }) => {
    const org = generateOrganization()
    const createRes = await createOrganization(adminApi, org)
    const created = await createRes.json()

    const res = await getAdminOrganizationById(adminApi, created.id)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.id).toBe(created.id)
    expect(body.data.name).toBe(org.name)
    expect(body.data.members).toBeInstanceOf(Array)
  })

  test('admin get organization by id returns 404 for unknown id', async ({ adminApi }) => {
    const res = await getAdminOrganizationById(adminApi, '00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(404)
  })

  test('admin can list all api keys', async ({ adminApi }) => {
    const res = await getAdminApiKeys(adminApi)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(typeof body.total).toBe('number')
  })

  test('admin can get api key by id', async ({ adminApi }) => {
    // Create an API key first
    const createRes = await createApiKey(adminApi, { name: 'e2e-admin-key' })
    expect(createRes.ok()).toBe(true)
    const created = await createRes.json()

    const res = await getAdminApiKeyById(adminApi, created.id)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.id).toBe(created.id)
    expect(body.data.name).toBe('e2e-admin-key')
  })

  test('admin can get user by id', async ({ adminApi, playwright }) => {
    // Create a regular user
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, user)
    const sessionRes = await signIn(userCtx, user.email, user.password)
    const session = await sessionRes.json()
    const userId = session.user?.id

    const res = await getAdminUserById(adminApi, userId)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.id).toBe(userId)
    expect(body.data.email).toBe(user.email)
    expect(body.data.memberships).toBeInstanceOf(Array)
    expect(body.data.projects).toBeInstanceOf(Array)
    expect(body.data.apiKeys).toBeInstanceOf(Array)

    await userCtx.dispose()
  })

  test('admin get user by id returns 404 for unknown id', async ({ adminApi }) => {
    const res = await getAdminUserById(adminApi, '00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(404)
  })

  test('non-admin cannot access admin endpoints', async ({ playwright }) => {
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, user)
    await signIn(userCtx, user.email, user.password)

    const res = await getAdminOrganizations(userCtx)
    expect(res.ok()).toBe(false)
    expect([401, 403]).toContain(res.status())

    await userCtx.dispose()
  })
})
