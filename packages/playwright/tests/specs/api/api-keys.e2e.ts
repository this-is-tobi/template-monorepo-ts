import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateApiKey } from '~/tests/helpers/factories.js'
import {
  apiUrl,
  BASE_URL,
  createApiKey,
  deleteApiKey,
  getSession,
  listApiKeys,
} from '~/tests/helpers/index.js'

test.describe('API Keys', () => {
  test('create an API key', async ({ adminApi }) => {
    const keyData = generateApiKey()
    const res = await createApiKey(adminApi, keyData)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.key).toBeTruthy() // the raw key is returned on creation
    expect(body.name).toBe(keyData.name)
  })

  test('list API keys', async ({ adminApi }) => {
    // Create a key first
    await createApiKey(adminApi, generateApiKey())

    const res = await listApiKeys(adminApi)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.apiKeys.length).toBeGreaterThanOrEqual(1)
  })

  test('delete an API key', async ({ adminApi }) => {
    const createRes = await createApiKey(adminApi, generateApiKey())
    const { id: keyId } = await createRes.json()

    const delRes = await deleteApiKey(adminApi, keyId)
    expect(delRes.ok()).toBe(true)
  })

  test('authenticate with API key via Bearer header', async ({ adminApi, playwright }) => {
    // Create an API key with permissions
    const createRes = await createApiKey(adminApi, {
      ...generateApiKey(),
      permissions: { project: ['create', 'read'] },
    })
    const { key } = await createRes.json()
    expect(key).toBeTruthy()

    // Create a new context (no cookies) and use the API key
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${key}`, Origin: BASE_URL },
    })

    // The API key should authenticate requests
    const sessionRes = await getSession(ctx)
    expect(sessionRes.ok()).toBe(true)

    await ctx.dispose()
  })

  test('admin can list all API keys', async ({ adminApi }) => {
    const res = await adminApi.get(apiUrl('/admin/api-keys'))
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeTruthy()
  })
})
