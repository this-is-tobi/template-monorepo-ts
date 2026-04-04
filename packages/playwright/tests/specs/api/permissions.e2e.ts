import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateProject, generateUser } from '~/tests/helpers/factories.js'
import {
  BASE_URL,
  createProject,
  deleteProject,
  getAuditLogs,
  getProject,
  signIn,
  signUp,
  updateConfig,
  updateProject,
} from '~/tests/helpers/index.js'

test.describe('Permissions API', () => {
  test('org owner can create and read projects', async ({ playwright }) => {
    const user = generateUser()
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(ctx, user)
    await signIn(ctx, user.email, user.password)
    const project = generateProject()
    const resA = await createProject(ctx, project)
    expect(resA.status()).toBe(201)
    const { data: created } = await resA.json()

    const getRes = await getProject(ctx, created.id)
    expect(getRes.ok()).toBe(true)

    await ctx.dispose()
  })

  test('admin can access any project', async ({ adminApi, playwright }) => {
    // Regular user creates a project
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, user)
    await signIn(userCtx, user.email, user.password)
    const project = generateProject()
    const createRes = await createProject(userCtx, project)
    expect(createRes.status()).toBe(201)
    const { data: created } = await createRes.json()

    // Admin can see it
    const res = await getProject(adminApi, created.id)
    expect(res.ok()).toBe(true)

    await userCtx.dispose()
  })

  test('org owner can query their own audit logs', async ({ playwright }) => {
    const user = generateUser()
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(ctx, user)
    await signIn(ctx, user.email, user.password)

    // Owner role has audit:read — this should succeed
    const res = await getAuditLogs(ctx)
    expect(res.ok()).toBe(true)

    await ctx.dispose()
  })

  test('org owner can update config', async ({ playwright }) => {
    const user = generateUser()
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(ctx, user)
    await signIn(ctx, user.email, user.password)

    // Owner role has config:update
    const res = await updateConfig(ctx, {
      appName: 'Owner Updated',
      enableRegistration: true,
      allowOrganizationCreation: true,
      documentationUrl: '',
      maintenanceMode: false,
      maxOrganizationsPerUser: null,
    })
    expect(res.ok()).toBe(true)

    await ctx.dispose()
  })

  test('project owner can update their project', async ({ playwright }) => {
    const user = generateUser()
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(ctx, user)
    await signIn(ctx, user.email, user.password)

    const project = generateProject()
    const createRes = await createProject(ctx, project)
    expect(createRes.status()).toBe(201)
    const { data: created } = await createRes.json()

    const updateRes = await updateProject(ctx, created.id, { name: 'Owner Updated' })
    expect(updateRes.ok()).toBe(true)

    await ctx.dispose()
  })

  test('unauthenticated user cannot delete a project', async ({ adminApi, playwright }) => {
    // Admin creates a project
    const project = generateProject()
    const createRes = await createProject(adminApi, project)
    expect(createRes.status()).toBe(201)
    const { data: created } = await createRes.json()

    // Unauthenticated request tries to delete it
    const anonCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    const res = await deleteProject(anonCtx, created.id)
    expect(res.ok()).toBe(false)

    await anonCtx.dispose()
  })

  test('disabled registration blocks sign-up', async ({ adminApi, playwright }) => {
    // Admin disables registration
    const configRes = await updateConfig(adminApi, {
      enableRegistration: false,
      allowOrganizationCreation: true,
      appName: 'Template Monorepo TS',
      documentationUrl: '',
      maintenanceMode: false,
      maxOrganizationsPerUser: null,
    })
    expect(configRes.ok()).toBe(true)

    // New user tries to sign up
    const user = generateUser()
    const ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    const res = await signUp(ctx, user)
    expect(res.ok()).toBe(false)

    // Re-enable registration
    await updateConfig(adminApi, {
      enableRegistration: true,
      allowOrganizationCreation: true,
      appName: 'Template Monorepo TS',
      documentationUrl: '',
      maintenanceMode: false,
      maxOrganizationsPerUser: null,
    })

    await ctx.dispose()
  })
})
