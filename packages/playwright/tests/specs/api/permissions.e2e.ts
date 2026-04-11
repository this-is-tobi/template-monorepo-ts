import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateApiKey, generateOrganization, generateProject, generateUser } from '~/tests/helpers/factories.js'
import {
  acceptInvitation,
  BASE_URL,
  createApiKey,
  createOrganization,
  createProject,
  createUser,
  deleteProject,
  getAuditLogs,
  getProject,
  getSession,
  inviteMember,
  listInvitations,
  setActiveOrganization,
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

  test('project viewer can read but not write or delete', async ({ adminApi, playwright }) => {
    const viewer = generateUser()
    const viewerCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await createUser(adminApi, viewer)
    await signIn(viewerCtx, viewer.email, viewer.password)

    // Create a non-personal org so invitation is allowed
    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    expect(orgRes.ok()).toBe(true)
    const orgData = await orgRes.json()

    // Set admin's active org before creating the project (project org comes from session)
    await setActiveOrganization(adminApi, orgData.id)

    const createRes = await createProject(adminApi, generateProject())
    expect(createRes.status()).toBe(201)
    const { data: project } = await createRes.json()

    // Invite viewer to the project's org so isOrgMember passes in addProjectMember
    await inviteMember(adminApi, { organizationId: orgData.id, email: viewer.email, role: 'member' })
    const invListRes = await listInvitations(adminApi, orgData.id)
    const invitations = await invListRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === viewer.email)
    expect(invitation).toBeTruthy()
    await acceptInvitation(viewerCtx, invitation.id)

    // Admin adds viewer as a project viewer
    const addRes = await adminApi.post(
      `/api/v1/projects/${project.id}/members`,
      { data: { email: viewer.email, role: 'viewer' } },
    )
    expect(addRes.ok()).toBe(true)

    // Viewer can read
    const readRes = await getProject(viewerCtx, project.id)
    expect(readRes.ok()).toBe(true)

    // Viewer cannot update
    const updateRes = await updateProject(viewerCtx, project.id, { name: 'Viewer Updated' })
    expect(updateRes.ok()).toBe(false)

    // Viewer cannot delete
    const deleteRes = await deleteProject(viewerCtx, project.id)
    expect(deleteRes.ok()).toBe(false)

    await viewerCtx.dispose()
  })

  test('project member can read and update but not delete', async ({ adminApi, playwright }) => {
    const member = generateUser()
    const memberCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await createUser(adminApi, member)
    await signIn(memberCtx, member.email, member.password)

    // Create a non-personal org so invitation is allowed
    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    expect(orgRes.ok()).toBe(true)
    const orgData = await orgRes.json()

    // Set admin's active org before creating the project (project org comes from session)
    await setActiveOrganization(adminApi, orgData.id)

    const createRes = await createProject(adminApi, generateProject())
    expect(createRes.status()).toBe(201)
    const { data: project } = await createRes.json()

    // Invite member to the project's org so isOrgMember passes in addProjectMember
    await inviteMember(adminApi, { organizationId: orgData.id, email: member.email, role: 'member' })
    const invListRes = await listInvitations(adminApi, orgData.id)
    const invitations = await invListRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === member.email)
    expect(invitation).toBeTruthy()
    await acceptInvitation(memberCtx, invitation.id)

    // Admin adds the user as a project member
    const addRes = await adminApi.post(
      `/api/v1/projects/${project.id}/members`,
      { data: { email: member.email, role: 'member' } },
    )
    expect(addRes.ok()).toBe(true)

    // Member can read
    const readRes = await getProject(memberCtx, project.id)
    expect(readRes.ok()).toBe(true)

    // Member can update
    const updateRes = await updateProject(memberCtx, project.id, { name: 'Member Updated' })
    expect(updateRes.ok()).toBe(true)

    // Member cannot delete
    const deleteRes = await deleteProject(memberCtx, project.id)
    expect(deleteRes.ok()).toBe(false)

    await memberCtx.dispose()
  })

  test('api key with org scope cannot access another org resources', async ({ adminApi, playwright }) => {
    // Admin creates a second org and sets it active
    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    expect(orgRes.ok()).toBe(true)
    const orgData = await orgRes.json()

    await setActiveOrganization(adminApi, orgData.id)

    // Create a project in this second org
    const project = generateProject()
    const projRes = await createProject(adminApi, project)
    expect(projRes.status()).toBe(201)
    const { data: created } = await projRes.json()

    // Create a new user and add them to the second org via invitation
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await createUser(adminApi, user)
    await signIn(userCtx, user.email, user.password)

    // Get the user's personal org before accepting invitation (which may change active org)
    const sessionRes = await getSession(userCtx)
    const sessionData = await sessionRes.json()
    const personalOrgId = sessionData.session.activeOrganizationId
    expect(personalOrgId).toBeTruthy()

    await inviteMember(adminApi, { organizationId: orgData.id, email: user.email, role: 'member' })
    const listRes = await listInvitations(adminApi, orgData.id)
    const invitations = await listRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === user.email)
    await acceptInvitation(userCtx, invitation.id)

    // User creates an API key, then scopes it to their personal org only
    const keyRes = await createApiKey(userCtx, generateApiKey())
    expect(keyRes.ok()).toBe(true)
    const { key, id: keyId } = await keyRes.json()

    const updateRes = await userCtx.put(
      `${BASE_URL}/api/v1/api-keys/${keyId}`,
      { data: { organizationIds: [personalOrgId] } },
    )
    expect(updateRes.ok()).toBe(true)

    // Use the scoped API key to access the second org's project — should be denied
    const apiKeyCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'x-api-key': key, Origin: BASE_URL },
    })
    const readRes = await getProject(apiKeyCtx, created.id)
    expect(readRes.ok()).toBe(false)
    expect(readRes.status()).toBe(403)

    await userCtx.dispose()
    await apiKeyCtx.dispose()
  })

  test('api key with project scope cannot access another project', async ({ adminApi, playwright }) => {
    const user = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await createUser(adminApi, user)
    await signIn(userCtx, user.email, user.password)

    // User creates two projects
    const p1Res = await createProject(userCtx, generateProject())
    expect(p1Res.status()).toBe(201)
    const { data: p1 } = await p1Res.json()

    const p2Res = await createProject(userCtx, generateProject())
    expect(p2Res.status()).toBe(201)
    const { data: p2 } = await p2Res.json()

    // User creates API key scoped only to p1
    const keyRes = await createApiKey(userCtx, generateApiKey())
    expect(keyRes.ok()).toBe(true)
    const { key, id: keyId } = await keyRes.json()

    const updateRes = await userCtx.put(
      `${BASE_URL}/api/v1/api-keys/${keyId}`,
      { data: { projectIds: [p1.id] } },
    )
    expect(updateRes.ok()).toBe(true)

    const apiKeyCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'x-api-key': key, Origin: BASE_URL },
    })

    // API key can access p1
    const readP1 = await getProject(apiKeyCtx, p1.id)
    expect(readP1.ok()).toBe(true)

    // API key cannot access p2 (outside scope)
    const readP2 = await getProject(apiKeyCtx, p2.id)
    expect(readP2.ok()).toBe(false)
    expect(readP2.status()).toBe(403)

    await userCtx.dispose()
    await apiKeyCtx.dispose()
  })
})
