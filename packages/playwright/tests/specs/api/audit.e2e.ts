import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateOrganization, generateProject, generateUser } from '~/tests/helpers/factories.js'
import {
  BASE_URL,
  createOrganization,
  createProject,
  getAuditLogs,
  getOrgAuditLogs,
  setActiveOrganization,
  signIn,
  signUp,
  updateConfig,
  updateTheme,
} from '~/tests/helpers/index.js'

test.describe('Audit API', () => {
  test.describe.configure({ mode: 'serial' })

  test('admin can query audit logs', async ({ adminApi }) => {
    const res = await getAuditLogs(adminApi)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(typeof body.total).toBe('number')
  })

  test('project creation generates an audit entry', async ({ adminApi }) => {
    const project = generateProject()
    await createProject(adminApi, project)

    // Query audit logs filtered by action
    const res = await getAuditLogs(adminApi, { action: 'project:create', resourceType: 'project' })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    const entry = body.data.find((e: Record<string, unknown>) => e.action === 'project:create' && e.resourceType === 'project')
    expect(entry).toBeTruthy()
    expect(entry.actorId).toBeTruthy()
  })

  test('config update generates an audit entry', async ({ adminApi }) => {
    await updateConfig(adminApi, {
      enableRegistration: true,
      allowOrganizationCreation: true,
      appName: 'E2E Test App',
      documentationUrl: '',
      maintenanceMode: false,
      maxOrganizationsPerUser: null,
    })

    const res = await getAuditLogs(adminApi, { action: 'config:update', resourceType: 'config' })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('theme update generates an audit entry', async ({ adminApi }) => {
    await updateTheme(adminApi, {
      primaryColor: 'blue',
      surfaceColor: 'zinc',
    })

    const res = await getAuditLogs(adminApi, { action: 'theme:update', resourceType: 'theme' })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('audit logs support pagination', async ({ adminApi }) => {
    const res = await getAuditLogs(adminApi, { limit: '2', offset: '0' })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeLessThanOrEqual(2)
    expect(typeof body.total).toBe('number')
  })

  test('unauthenticated user cannot query audit logs', async ({ request }) => {
    const res = await getAuditLogs(request)
    expect(res.ok()).toBe(false)
  })
})

test.describe('Org-Level Audit API', () => {
  test.describe.configure({ mode: 'serial' })

  test('org owner can query org-scoped audit logs', async ({ playwright }) => {
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, user)
    await signIn(userCtx, user.email, user.password)

    // Get the personal org created on sign-up
    const orgsRes = await userCtx.get(`${BASE_URL}/api/v1/auth/organization/list`)
    const orgs = await orgsRes.json()
    expect(orgs.length).toBeGreaterThanOrEqual(1)
    const orgId = orgs[0].id

    // Create a project to generate an audit entry
    const project = generateProject()
    await createProject(userCtx, { ...project, organizationId: orgId })

    const res = await getOrgAuditLogs(userCtx, orgId)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(typeof body.total).toBe('number')

    await userCtx.dispose()
  })

  test('admin can query org-scoped audit logs for any org', async ({ adminApi }) => {
    const org = generateOrganization()
    const createRes = await createOrganization(adminApi, org)
    const created = await createRes.json()

    const res = await getOrgAuditLogs(adminApi, created.id)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(typeof body.total).toBe('number')
  })

  test('org regular member cannot query org-scoped audit logs', async ({ adminApi, playwright }) => {
    // Create a regular user
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, user)
    await signIn(userCtx, user.email, user.password)

    // Admin creates an org and invites user as member
    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const created = await orgRes.json()

    await adminApi.post(`${BASE_URL}/api/v1/auth/organization/invite-member`, {
      data: { organizationId: created.id, email: user.email, role: 'member' },
    })

    // Member role does not have audit:read — should be 403
    const res = await getOrgAuditLogs(userCtx, created.id)
    expect([401, 403]).toContain(res.status())

    await userCtx.dispose()
  })

  test('org audit logs are scoped to the org', async ({ adminApi }) => {
    const orgA = generateOrganization()
    const orgB = generateOrganization()
    const resA = await createOrganization(adminApi, orgA)
    const resB = await createOrganization(adminApi, orgB)
    const createdA = await resA.json()
    const createdB = await resB.json()

    // Create a project in org A — must set active org first, as the API uses session's active org
    await setActiveOrganization(adminApi, createdA.id)
    await createProject(adminApi, { ...generateProject(), organizationId: createdA.id })

    // Audit logs for org B should not include org A's project
    const logsB = await getOrgAuditLogs(adminApi, createdB.id)
    expect(logsB.ok()).toBe(true)
    const bodyB = await logsB.json()

    // Audit logs for org A should have some entries
    const logsA = await getOrgAuditLogs(adminApi, createdA.id)
    expect(logsA.ok()).toBe(true)
    const bodyA = await logsA.json()

    // The total for org A should be >= 1 (project creation), org B shouldn't see those
    expect(bodyA.total).toBeGreaterThanOrEqual(1)
    // Totals must differ or org B must not have org A's entry
    const orgAIds = new Set(bodyA.data.map((e: Record<string, unknown>) => e.id))
    const orgBLogs = bodyB.data as Record<string, unknown>[]
    const crossLeak = orgBLogs.filter(e => orgAIds.has(e.id))
    expect(crossLeak.length).toBe(0)
  })

  test('unauthenticated user cannot query org audit logs', async ({ request }) => {
    const res = await getOrgAuditLogs(request, 'some-org-id')
    expect(res.ok()).toBe(false)
  })
})
