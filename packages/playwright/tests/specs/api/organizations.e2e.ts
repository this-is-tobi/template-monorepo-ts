import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import { generateOrganization, generateUser } from '~/tests/helpers/factories.js'
import {
  acceptInvitation,
  apiUrl,
  BASE_URL,
  cancelInvitation,
  createOrganization,
  getFullOrganization,
  inviteMember,
  listInvitations,
  listOrganizations,
  rejectInvitation,
  removeMember,
  setActiveOrganization,
  signIn,
  signUp,
  updateMemberRole,
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

    const inviteRes = await inviteMember(adminApi, {
      organizationId: orgData.id,
      email: newUser.email,
      role: 'member',
    })
    expect(inviteRes.ok()).toBe(true)

    await userCtx.dispose()
  })

  test('invitation lifecycle: accept grants membership', async ({ adminApi, playwright }) => {
    const newUser = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, newUser)

    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const orgData = await orgRes.json()

    // Admin invites the user
    await inviteMember(adminApi, { organizationId: orgData.id, email: newUser.email, role: 'member' })

    // Admin lists invitations to get the invitationId
    const listRes = await listInvitations(adminApi, orgData.id)
    expect(listRes.ok()).toBe(true)
    const invitations = await listRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === newUser.email)
    expect(invitation).toBeTruthy()

    // User signs in and accepts the invitation
    await signIn(userCtx, newUser.email, newUser.password)
    const acceptRes = await acceptInvitation(userCtx, invitation.id)
    expect(acceptRes.ok()).toBe(true)

    // User is now a member — they can get the org
    const orgDetail = await getFullOrganization(userCtx, orgData.id)
    expect(orgDetail.ok()).toBe(true)
    const orgBody = await orgDetail.json()
    const isMember = orgBody.members.some((m: { userId: string }) => m.userId !== undefined)
    expect(isMember).toBe(true)

    await userCtx.dispose()
  })

  test('invitation lifecycle: reject keeps user as non-member', async ({ adminApi, playwright }) => {
    const newUser = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, newUser)
    await signIn(userCtx, newUser.email, newUser.password)

    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const orgData = await orgRes.json()

    await inviteMember(adminApi, { organizationId: orgData.id, email: newUser.email, role: 'member' })

    const listRes = await listInvitations(adminApi, orgData.id)
    const invitations = await listRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === newUser.email)

    // User rejects the invitation
    const rejectRes = await rejectInvitation(userCtx, invitation.id)
    expect(rejectRes.ok()).toBe(true)

    // User is still not a member — cannot access the org
    const orgDetail = await getFullOrganization(userCtx, orgData.id)
    expect(orgDetail.ok()).toBe(false)

    await userCtx.dispose()
  })

  test('invitation lifecycle: cancel removes the invitation', async ({ adminApi, playwright }) => {
    const newUser = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, newUser)
    await signIn(userCtx, newUser.email, newUser.password)

    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const orgData = await orgRes.json()

    await inviteMember(adminApi, { organizationId: orgData.id, email: newUser.email, role: 'member' })

    const listRes = await listInvitations(adminApi, orgData.id)
    const invitations = await listRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === newUser.email)

    // Admin cancels the invitation
    const cancelRes = await cancelInvitation(adminApi, invitation.id)
    expect(cancelRes.ok()).toBe(true)

    // User can no longer accept the cancelled invitation
    const acceptRes = await acceptInvitation(userCtx, invitation.id)
    expect(acceptRes.ok()).toBe(false)

    await userCtx.dispose()
  })

  test('remove member revokes org access', async ({ adminApi, playwright }) => {
    const newUser = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, newUser)
    await signIn(userCtx, newUser.email, newUser.password)

    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const orgData = await orgRes.json()

    // Invite and accept to make the user a member
    await inviteMember(adminApi, { organizationId: orgData.id, email: newUser.email, role: 'member' })
    const listRes = await listInvitations(adminApi, orgData.id)
    const invitations = await listRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === newUser.email)
    await acceptInvitation(userCtx, invitation.id)

    // Confirm user is a member
    const beforeRemove = await getFullOrganization(userCtx, orgData.id)
    expect(beforeRemove.ok()).toBe(true)

    // Admin removes the member
    const removeRes = await removeMember(adminApi, { organizationId: orgData.id, memberIdOrEmail: newUser.email })
    expect(removeRes.ok()).toBe(true)

    // User can no longer access the org
    const afterRemove = await getFullOrganization(userCtx, orgData.id)
    expect(afterRemove.ok()).toBe(false)

    await userCtx.dispose()
  })

  test('update member role is reflected in org details', async ({ adminApi, playwright }) => {
    const newUser = generateUser()
    const userCtx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Origin: BASE_URL },
    })
    await signUp(userCtx, newUser)
    await signIn(userCtx, newUser.email, newUser.password)

    const org = generateOrganization()
    const orgRes = await createOrganization(adminApi, org)
    const orgData = await orgRes.json()

    // Invite as member, accept
    await inviteMember(adminApi, { organizationId: orgData.id, email: newUser.email, role: 'member' })
    const listRes = await listInvitations(adminApi, orgData.id)
    const invitations = await listRes.json()
    const invitation = invitations.find((i: { email: string }) => i.email === newUser.email)
    await acceptInvitation(userCtx, invitation.id)

    // Get the memberId
    const orgDetail = await getFullOrganization(adminApi, orgData.id)
    const orgBody = await orgDetail.json()
    const member = orgBody.members.find((m: { role: string, userId: string }) => m.role === 'member')

    // Admin promotes user to admin
    const updateRes = await updateMemberRole(adminApi, {
      organizationId: orgData.id,
      memberId: member.id,
      role: 'admin',
    })
    expect(updateRes.ok()).toBe(true)

    // Verify updated role
    const updatedOrg = await getFullOrganization(adminApi, orgData.id)
    const updatedBody = await updatedOrg.json()
    const updatedMember = updatedBody.members.find((m: { id: string }) => m.id === member.id)
    expect(updatedMember.role).toBe('admin')

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
