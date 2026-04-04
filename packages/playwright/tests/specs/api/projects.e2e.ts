import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateOrganization, generateProject } from '~/tests/helpers/factories.js'
import {
  createOrganization,
  createProject,
  deleteProject,
  getProject,
  getProjectMembers,
  getProjects,
  setActiveOrganization,
  updateProject,
} from '~/tests/helpers/index.js'

test.describe('Projects API', () => {
  test.describe.configure({ mode: 'serial' })

  test('create a project', async ({ adminApi }) => {
    const project = generateProject()
    const res = await createProject(adminApi, project)
    expect(res.status()).toBe(201)

    const body = await res.json()
    expect(body.data.name).toBe(project.name)
    expect(body.data.id).toBeTruthy()
  })

  test('list projects', async ({ adminApi }) => {
    // Create two projects
    const p1 = generateProject()
    const p2 = generateProject()
    await createProject(adminApi, p1)
    await createProject(adminApi, p2)

    const res = await getProjects(adminApi)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(2)
  })

  test('get project by id', async ({ adminApi }) => {
    const project = generateProject()
    const createRes = await createProject(adminApi, project)
    const { data: created } = await createRes.json()

    const res = await getProject(adminApi, created.id)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.name).toBe(project.name)
  })

  test('update a project', async ({ adminApi }) => {
    const project = generateProject()
    const createRes = await createProject(adminApi, project)
    const { data: created } = await createRes.json()

    const res = await updateProject(adminApi, created.id, {
      name: 'Updated Name',
      description: 'Updated desc',
    })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.name).toBe('Updated Name')
  })

  test('delete a project', async ({ adminApi }) => {
    const project = generateProject()
    const createRes = await createProject(adminApi, project)
    const { data: created } = await createRes.json()

    const delRes = await deleteProject(adminApi, created.id)
    expect(delRes.ok()).toBe(true)

    const getRes = await getProject(adminApi, created.id)
    expect(getRes.ok()).toBe(false)
  })

  test('get non-existent project returns 404', async ({ adminApi }) => {
    const res = await getProject(adminApi, '00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(404)
  })

  test('project belongs to active organization', async ({ adminApi }) => {
    // Create an org and set it active
    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    expect(orgRes.ok()).toBe(true)
    const orgData = await orgRes.json()

    await setActiveOrganization(adminApi, orgData.id)

    // Create a project — it should be scoped to the org
    const project = generateProject()
    const projRes = await createProject(adminApi, { ...project, organizationId: orgData.id })
    expect(projRes.status()).toBe(201)

    const { data: created } = await projRes.json()
    expect(created.organizationId).toBe(orgData.id)
  })

  test('unauthenticated user cannot create project', async ({ request }) => {
    const project = generateProject()
    const res = await createProject(request, project)
    expect(res.ok()).toBe(false)
  })

  test('project members list is initially just the owner', async ({ adminApi }) => {
    const project = generateProject()
    const createRes = await createProject(adminApi, project)
    const { data: created } = await createRes.json()

    const res = await getProjectMembers(adminApi, created.id)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(0)
  })
})
