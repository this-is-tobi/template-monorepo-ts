import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateOrganization, generateUser } from '~/tests/helpers/factories.js'
import {
  apiUrl,
  BASE_URL,
  createOrganization,
  getFullOrganization,
  listOrganizations,
  setActiveOrganization,
  signUp,
} from '~/tests/helpers/index.js'

test.describe('Organizations API', () => {
  test('create an organization', async ({ adminApi }) => {
    const org = generateOrganization()
    const res = await createOrganization(adminApi, org)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.name).toBe(org.name)
    expect(body.slug).toBe(org.slug)
    expect(body.id).toBeTruthy()
  })

  test('list organizations returns user orgs', async ({ adminApi }) => {
    // Admin should have at least their personal org
    const res = await listOrganizations(adminApi)
    expect(res.ok()).toBe(true)

    const orgs = await res.json()
    expect(orgs.length).toBeGreaterThanOrEqual(1)
  })

  test('set active organization', async ({ adminApi }) => {
    const org = generateOrganization()
    const createRes = await createOrganization(adminApi, org)
    const orgData = await createRes.json()

    const res = await setActiveOrganization(adminApi, orgData.id)
    expect(res.ok()).toBe(true)
  })

  test('get full organization details', async ({ adminApi }) => {
    const org = generateOrganization()
    const createRes = await createOrganization(adminApi, org)
    const orgData = await createRes.json()

    const res = await getFullOrganization(adminApi, orgData.id)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.name).toBe(org.name)
    expect(body.members).toBeTruthy()
    expect(body.members.length).toBeGreaterThanOrEqual(1) // creator is a member
  })

  test('invite member to organization', async ({ adminApi, playwright }) => {
    // Create a user to invite
    const newUser = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, newUser)

    // Create org and invite
    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const orgData = await orgRes.json()

    const inviteRes = await adminApi.post(apiUrl('/auth/organization/invite-member'), {
      data: {
        organizationId: orgData.id,
        email: newUser.email,
        role: 'member',
      },
    })
    expect(inviteRes.ok()).toBe(true)

    await userCtx.dispose()
  })

  test('user cannot access another user org details', async ({ playwright }) => {
    // Create two users with their own orgs
    const user1 = generateUser()
    const user2 = generateUser()

    const ctx1 = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(ctx1, user1)
    const org = generateOrganization()
    const orgRes = await createOrganization(ctx1, org)
    const orgData = await orgRes.json()

    const ctx2 = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(ctx2, user2)

    // user2 should not be able to get user1's org
    const res = await getFullOrganization(ctx2, orgData.id)
    expect(res.ok()).toBe(false)

    await ctx1.dispose()
    await ctx2.dispose()
  })

  test('admin can list all organizations', async ({ adminApi }) => {
    const res = await adminApi.get(apiUrl('/admin/organizations'))
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeTruthy()
    expect(body.total).toBeGreaterThanOrEqual(1)
  })
})
