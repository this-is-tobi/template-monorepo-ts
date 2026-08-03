import type { Session } from '~/modules/auth/auth.js'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { getConfigQuery } from '~/resources/config/queries.js'
import { countUserOrganizations, isPersonalOrg } from '~/resources/projects/queries.js'

/**
 * Tests for the auth router catch-all route.
 * Since auth.ts is globally mocked, we test the routing behavior
 * without hitting the real BetterAuth handler.
 */

// Unmock auth to get the mock's handler function
const { auth, logAuthAudit } = await import('~/modules/auth/auth.js')

vi.mock('~/resources/config/queries.js', () => ({
  getConfigQuery: vi.fn().mockResolvedValue({
    enableRegistration: true,
    allowOrganizationCreation: true,
    appName: 'Template Monorepo TS',
    documentationUrl: '',
    maintenanceMode: false,
    maxOrganizationsPerUser: null,
  }),
  getSsoProviders: vi.fn().mockReturnValue([]),
  invalidateConfigCache: vi.fn(),
}))

vi.mock('~/resources/projects/queries.js', () => ({
  countUserOrganizations: vi.fn().mockResolvedValue(0),
  isPersonalOrg: vi.fn().mockResolvedValue(false),
}))

describe('[Auth] - router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should forward GET /api/v1/auth/* to BetterAuth handler', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should forward POST /api/v1/auth/* to BetterAuth handler', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-in/email`)
      .body({ email: 'test@test.com', password: 'password' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should return 500 when BetterAuth handler throws', async () => {
    vi.mocked(auth.handler).mockRejectedValueOnce(new Error('auth error'))

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(response.statusCode).toEqual(500)
    expect(response.json().message).toEqual('Internal authentication error')
  })

  it('should handle response with no body (204 No Content)', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(204)
  })

  it('should handle non-Error exception in catch block', async () => {
    vi.mocked(auth.handler).mockRejectedValueOnce('plain string error')

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(response.statusCode).toEqual(500)
    expect(response.json().message).toEqual('Internal authentication error')
  })

  it('should forward a string body (text/plain) directly to BetterAuth', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    // Sending a JSON-string literal makes Fastify parse the body as a JS string,
    // so typeof request.body === 'string' is true (covers line 28).
    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-in`)
      .headers({ 'content-type': 'application/json' })
      .payload('"raw string body"')
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should block sign-up when registration is disabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: false, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-up/email`)
      .body({ email: 'new@test.com', password: 'password', name: 'New User' })
      .end()

    expect(auth.handler).not.toHaveBeenCalled()
    expect(response.statusCode).toEqual(403)
    expect(response.json().message).toEqual('Registration is currently disabled')
  })

  describe('service accounts', () => {
    it('should refuse a sign-up on the reserved service domain', async () => {
      // Service accounts are provisioned lazily at `<projectId>@…`. Letting
      // someone register that address first would either break provisioning
      // or hand them an account the project trusts as its own identity.
      vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null, auditRetentionDays: 0 })

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-up/email`)
        .body({ email: 'proj-1@service.invalid', password: 'password', name: 'Squatter' })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('That email domain is reserved')
    })

    it('should refuse admin user-management against a service account', async () => {
      // They are `user` rows, so set-role / ban / impersonate would all work
      // on one — promoting a machine identity to platform admin.
      db.user.findUnique.mockResolvedValueOnce({ role: 'service', serviceProjectId: 'proj-1' } as never)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/admin/set-role`)
        .body({ userId: 'svc-1', role: 'admin' })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
    })

    it('should leave admin user-management on real users alone', async () => {
      db.user.findUnique.mockResolvedValueOnce({ role: 'user', serviceProjectId: null } as never)
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/admin/set-role`)
        .body({ userId: 'user-1', role: 'admin' })
        .end()

      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
  })

  it('should allow sign-up when registration is enabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-up/email`)
      .body({ email: 'new@test.com', password: 'password', name: 'New User' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should not check config for non-signup auth routes', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-in/email`)
      .body({ email: 'test@test.com', password: 'password' })
      .end()

    expect(getConfigQuery).not.toHaveBeenCalled()
  })

  it('should block organization creation for non-admin users when disabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: false, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'user' } } as unknown as Session)

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).not.toHaveBeenCalled()
    expect(response.statusCode).toEqual(403)
    expect(response.json().message).toEqual('Organization creation is currently disabled')
  })

  it('should allow organization creation for admin users even when disabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: false, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'admin' } } as unknown as Session)
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should allow organization creation when enabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'user' } } as unknown as Session)
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should block organization creation when user exceeds quota', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: 3, maxProjectsPerOrg: null })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'user' } } as unknown as Session)
    vi.mocked(countUserOrganizations).mockResolvedValueOnce(3)

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).not.toHaveBeenCalled()
    expect(response.statusCode).toEqual(403)
    expect(response.json().message).toEqual('Organization limit reached (max 3)')
  })

  it('should allow organization creation for admin even when quota exceeded', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: 3, maxProjectsPerOrg: null })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'admin' } } as unknown as Session)
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(countUserOrganizations).not.toHaveBeenCalled()
    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should not check quota when maxOrganizationsPerUser is null (unlimited)', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'user' } } as unknown as Session)
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(countUserOrganizations).not.toHaveBeenCalled()
    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  describe('personal org invitation guard', () => {
    it('should block invitation to a personal organization', async () => {
      vi.mocked(isPersonalOrg).mockResolvedValueOnce(true)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/invite-member`)
        .body({ organizationId: 'personal-org-1', email: 'user@test.com', role: 'member' })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Cannot invite members to a personal organization')
    })

    it('should allow invitation to a regular organization', async () => {
      vi.mocked(isPersonalOrg).mockResolvedValueOnce(false)
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/invite-member`)
        .body({ organizationId: 'regular-org-1', email: 'user@test.com', role: 'member' })
        .end()

      expect(isPersonalOrg).toHaveBeenCalledWith('regular-org-1')
      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should forward invitation without organizationId to BetterAuth', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/invite-member`)
        .body({ email: 'user@test.com', role: 'member' })
        .end()

      expect(isPersonalOrg).not.toHaveBeenCalled()
      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('settled invitation guard', () => {
    // Accepting inserts a member row without checking for one, so a recipient
    // who joined by another route in the meantime hit the unique index and got
    // a 500 — leaving the invitation pending and unacceptable for good.
    const invitation = {
      id: 'inv-1',
      email: 'Recipient@Test.com',
      organizationId: 'org-1',
      role: 'admin',
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    }
    const session = { user: { id: 'user-1', email: 'recipient@test.com' } } as unknown as Session

    function acceptRequest() {
      return app.inject()
        .post(`${apiPrefix.v1}/auth/organization/accept-invitation`)
        .body({ invitationId: 'inv-1' })
        .end()
    }

    function forwards() {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    }

    it('should settle the invitation and return the membership the caller already holds', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(session)
      db.invitation.findUnique.mockResolvedValueOnce(invitation as never)
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem-1', organizationId: 'org-1', userId: 'user-1', role: 'member' } as never)
      db.invitation.update.mockResolvedValueOnce({ ...invitation, status: 'accepted' } as never)

      const response = await acceptRequest()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(200)
      expect(response.json().invitation.status).toEqual('accepted')
      // The membership predates the invitation — answer with the role they
      // hold, not the one the invitation offered.
      expect(response.json().member.role).toEqual('member')
      expect(db.invitation.update).toHaveBeenCalledWith({ where: { id: 'inv-1' }, data: { status: 'accepted' } })
      expect(logAuthAudit).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'user-1',
        action: 'invitation:accept',
        resourceId: 'org-1',
        details: expect.objectContaining({ invitationId: 'inv-1', alreadyMember: true }),
      }))
    })

    it('should forward to BetterAuth when the caller is not a member yet', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(session)
      db.invitation.findUnique.mockResolvedValueOnce(invitation as never)
      db.member.findFirst.mockResolvedValueOnce(null)
      forwards()

      const response = await acceptRequest()

      expect(db.invitation.update).not.toHaveBeenCalled()
      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should not settle an invitation addressed to somebody else', async () => {
      // The guard writes without BetterAuth's checks, so a member of the org
      // must not be able to settle — and so silently cancel — a colleague's
      // invitation by quoting its id.
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-2', email: 'other@test.com' } } as unknown as Session)
      db.invitation.findUnique.mockResolvedValueOnce(invitation as never)
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem-2', organizationId: 'org-1', userId: 'user-2', role: 'admin' } as never)
      forwards()

      await acceptRequest()

      expect(db.invitation.update).not.toHaveBeenCalled()
      expect(auth.handler).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['already settled', { ...invitation, status: 'accepted' }],
      ['expired', { ...invitation, expiresAt: new Date(Date.now() - 60_000) }],
    ])('should leave an invitation that is %s to BetterAuth to refuse', async (_label, stale) => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(session)
      db.invitation.findUnique.mockResolvedValueOnce(stale as never)
      forwards()

      await acceptRequest()

      expect(db.member.findFirst).not.toHaveBeenCalled()
      expect(db.invitation.update).not.toHaveBeenCalled()
      expect(auth.handler).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['carrying no invitation id', {}],
      // A non-string id would reach Prisma as a malformed `where` and throw,
      // answering with a 500 what BetterAuth answers with a 400.
      ['whose invitation id is not a string', { invitationId: 42 }],
    ])('should forward a request %s', async (_label, body) => {
      forwards()

      await app.inject()
        .post(`${apiPrefix.v1}/auth/organization/accept-invitation`)
        .body(body)
        .end()

      expect(db.invitation.findUnique).not.toHaveBeenCalled()
      expect(auth.handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('api key creation', () => {
    it('should create API key server-side with permissions for admin user', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'admin' }, session: { id: 's-1', activeOrganizationId: 'org-1' } } as unknown as Session)
      vi.mocked(auth.api.createApiKey).mockResolvedValueOnce({ key: 'test-key-123', id: 'key-1' } as never)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key', permissions: { project: ['read', 'create'] } })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(auth.api.createApiKey).toHaveBeenCalledWith({
        body: {
          name: 'My Key',
          permissions: { project: ['read', 'create'] },
          userId: 'user-1',
        },
      })
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual({ key: 'test-key-123', id: 'key-1' })
    })

    it('should create API key without permissions for any user', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' }, session: { id: 's-1', activeOrganizationId: 'org-1' } } as unknown as Session)
      vi.mocked(auth.api.createApiKey).mockResolvedValueOnce({ key: 'test-key-456', id: 'key-2' } as never)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key' })
        .end()

      expect(auth.api.createApiKey).toHaveBeenCalledWith({
        body: { name: 'My Key', userId: 'user-1' },
      })
      expect(response.statusCode).toEqual(200)
    })

    it('should block non-admin users from creating keys with wildcard permissions', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' }, session: { id: 's-1', activeOrganizationId: 'org-1' } } as unknown as Session)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key', permissions: { '*': ['*'] } })
        .end()

      expect(auth.api.createApiKey).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Wildcard permissions are restricted to platform administrators')
    })

    it('should block non-admin users from creating keys with wildcard action', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' }, session: { id: 's-1', activeOrganizationId: 'org-1' } } as unknown as Session)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key', permissions: { project: ['*'] } })
        .end()

      expect(auth.api.createApiKey).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
    })

    it('should allow admin users to create keys with wildcard permissions', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'admin-1', role: 'admin' }, session: { id: 's-1' } } as unknown as Session)
      vi.mocked(auth.api.createApiKey).mockResolvedValueOnce({ key: 'admin-key', id: 'key-3' } as never)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'Admin Key', permissions: { '*': ['*'] } })
        .end()

      expect(auth.api.createApiKey).toHaveBeenCalled()
      expect(response.statusCode).toEqual(200)
    })

    it('should block non-admin users without active org from creating keys with permissions', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' }, session: { id: 's-1' } } as unknown as Session)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key', permissions: { project: ['read'] } })
        .end()

      expect(auth.api.createApiKey).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('An active organization is required to create API keys with permissions')
    })

    it('should block non-admin users requesting permissions beyond their org role', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' }, session: { id: 's-1', activeOrganizationId: 'org-1' } } as unknown as Session)
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key', permissions: { project: ['create', 'delete'] } })
        .end()

      expect(auth.api.hasPermission).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        body: { userId: 'user-1', organizationId: 'org-1', permissions: { project: ['create', 'delete'] } },
      })
      expect(auth.api.createApiKey).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Requested permissions exceed your current role')
    })

    it('should allow non-admin users to create keys matching their org role', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: 'user-1', role: 'user' }, session: { id: 's-1', activeOrganizationId: 'org-1' } } as unknown as Session)
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })
      vi.mocked(auth.api.createApiKey).mockResolvedValueOnce({ key: 'user-key', id: 'key-4' } as never)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key', permissions: { project: ['read'] } })
        .end()

      expect(auth.api.hasPermission).toHaveBeenCalled()
      expect(auth.api.createApiKey).toHaveBeenCalledWith({
        body: {
          name: 'My Key',
          permissions: { project: ['read'] },
          userId: 'user-1',
          // Regression: must be `organizationIds: [orgId]` (plural array)
          // so the metadata parser in `parseApiKeyMetadata` actually picks it
          // up.  Writing `organizationId: orgId` was silently dropped by Zod
          // and disabled the org-scope guard for non-admin keys.
          // metadata is passed as an object (BetterAuth handles serialization)
          metadata: { organizationIds: ['org-1'] },
        },
      })
      expect(response.statusCode).toEqual(200)
    })

    it('should return 401 when creating API key without session', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/create`)
        .body({ name: 'My Key' })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(auth.api.createApiKey).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(401)
    })
  })

  // Regression: BetterAuth's own `/api-key/update` marks `permissions`
  // server-only but writes caller-supplied `metadata` verbatim — and metadata
  // is where an API key's org scope lives. Proxying it let a user mint a key
  // whose permissions were validated against their personal organization, then
  // clear the pin with `{"metadata":{}}`; an unscoped permissioned key skips
  // the scope check in `requirePermission`, so it acted in every tenant.
  describe('api key mutation guard', () => {
    it('should refuse BetterAuth /api-key/update instead of forwarding it', async () => {
      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/update`)
        .body({ keyId: 'key-1', metadata: {} })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('API_KEY_MUTATION_NOT_ALLOWED')
    })

    it('should refuse an unknown /api-key/* mutation rather than admitting it by silence', async () => {
      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/rotate`)
        .body({ keyId: 'key-1' })
        .end()

      expect(auth.handler).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
    })

    it('should still forward /api-key/delete, which grants nothing', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/api-key/delete`)
        .body({ keyId: 'key-1' })
        .end()

      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should still forward the read endpoints', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      const response = await app.inject()
        .get(`${apiPrefix.v1}/auth/api-key/list`)
        .end()

      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should see through percent-encoding in the path', async () => {
      // `URL` leaves `pathname` encoded, so a guard matching the raw string
      // reads `/api%2Dkey/update` as an unrelated route and forwards it.
      for (const path of ['/auth/api%2Dkey/update', '/auth/api-key/%75pdate']) {
        const response = await app.inject()
          .post(`${apiPrefix.v1}${path}`)
          .body({ keyId: 'key-1', metadata: {} })
          .end()

        expect(auth.handler).not.toHaveBeenCalled()
        expect(response.statusCode).toEqual(403)
      }
    })

    it('should not mistake a path merely ending in the action for an api-key route', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      const response = await app.inject()
        .post(`${apiPrefix.v1}/auth/organization/update`)
        .body({ name: 'Acme' })
        .end()

      expect(auth.handler).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('auth event auditing', () => {
    it('should emit audit entry on successful sign-in', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 'user-1' }, session: { userId: 'user-1', activeOrganizationId: 'org-1' } }), { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-in/email`)
        .body({ email: 'test@test.com', password: 'pass' })
        .end()

      // Allow fire-and-forget promise to resolve
      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).toHaveBeenCalledWith({
        actorId: 'user-1',
        action: 'sign-in',
        resourceType: 'session',
        organizationId: 'org-1',
        details: { method: 'email', ip: expect.any(String), userAgent: expect.any(String) },
      })
    })

    it('should attribute an SSO sign-in to the user the callback just authenticated', async () => {
      // Regression: `POST /sign-in/oauth2` only hands back a redirect URL, so
      // it was audited as a sign-in by `unknown` — for every flow, including
      // abandoned ones — while the callback that actually signs the user in
      // was never audited at all. SSO logins were therefore unattributable.
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: '/', 'set-cookie': 'better-auth.session_token=tok-1; Path=/; HttpOnly' },
        }),
      )
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: 'user-sso' },
        session: { id: 's-9', activeOrganizationId: 'org-9' },
      } as unknown as Session)

      await app.inject()
        .get(`${apiPrefix.v1}/auth/oauth2/callback/keycloak?code=abc&state=xyz`)
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'user-sso',
        action: 'sign-in',
        organizationId: 'org-9',
        details: expect.objectContaining({ method: 'keycloak' }),
      }))
      // The session was read back from the cookie the response just issued.
      expect(auth.api.getSession).toHaveBeenCalledWith(
        expect.objectContaining({ headers: expect.any(Headers) }),
      )
    })

    it('should not audit the start of an SSO redirect as a sign-in', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response(JSON.stringify({ url: 'https://idp.test/authorize', redirect: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

      await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-in/oauth2`)
        .body({ providerId: 'keycloak' })
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).not.toHaveBeenCalled()
    })

    it('should emit audit entry on sign-out', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
      )
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: 'user-1' },
        session: { id: 's-1', activeOrganizationId: 'org-1' },
      } as unknown as Session)

      await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-out`)
        .body({})
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).toHaveBeenCalledWith({
        actorId: 'user-1',
        action: 'sign-out',
        resourceType: 'session',
        organizationId: 'org-1',
        details: { ip: expect.any(String), userAgent: expect.any(String) },
      })
    })

    it('should resolve the sign-out actor before the session is destroyed', async () => {
      // Regression: the actor was read after the handler ran, by which point
      // the session was gone. It only resolved while the 5-minute cookie cache
      // happened to be warm, so sign-outs were intermittently `unknown`.
      const seenOrder: string[] = []
      vi.mocked(auth.api.getSession).mockImplementationOnce(async () => {
        seenOrder.push('getSession')
        return { user: { id: 'user-1' }, session: { id: 's-1' } } as unknown as Session
      })
      vi.mocked(auth.handler).mockImplementationOnce(async () => {
        seenOrder.push('handler')
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      })

      await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-out`)
        .body({})
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(seenOrder).toStrictEqual(['getSession', 'handler'])
      expect(logAuthAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'user-1' }))
    })

    it('should not emit audit entry for non-matching POST routes', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      await app.inject()
        .post(`${apiPrefix.v1}/auth/some-other-endpoint`)
        .body({})
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).not.toHaveBeenCalled()
    })

    it('should not emit audit entry for failed auth responses', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } }),
      )

      await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-in/email`)
        .body({ email: 'test@test.com', password: 'wrong' })
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).not.toHaveBeenCalled()
    })

    it('should emit audit entry on sign-up', async () => {
      vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null })
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      await app.inject()
        .post(`${apiPrefix.v1}/auth/sign-up/email`)
        .body({ email: 'new@test.com', password: 'pass', name: 'New' })
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'sign-up', resourceType: 'user' }),
      )
    })

    it('should emit audit entry on password change', async () => {
      vi.mocked(auth.handler).mockResolvedValueOnce(
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
      )

      await app.inject()
        .post(`${apiPrefix.v1}/auth/change-password`)
        .body({ currentPassword: 'old', newPassword: 'new' })
        .end()

      await new Promise(r => setTimeout(r, 10))

      expect(logAuthAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'change-password', resourceType: 'user' }),
      )
    })
  })
})
