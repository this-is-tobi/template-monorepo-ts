import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateProject } from '~/tests/helpers/factories.js'
import {
  createProject,
  getAuditLogs,
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
    const res = await getAuditLogs(adminApi, { action: 'create', resourceType: 'project' })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    const entry = body.data.find((e: Record<string, unknown>) => e.action === 'create' && e.resourceType === 'project')
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

    const res = await getAuditLogs(adminApi, { action: 'update', resourceType: 'config' })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('theme update generates an audit entry', async ({ adminApi }) => {
    await updateTheme(adminApi, {
      primaryColor: 'blue',
      surfaceColor: 'zinc',
    })

    const res = await getAuditLogs(adminApi, { action: 'update', resourceType: 'theme' })
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
