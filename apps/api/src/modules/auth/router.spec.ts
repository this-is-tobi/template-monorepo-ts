import type { Session } from '~/modules/auth/auth.js'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: false, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-up/email`)
      .body({ email: 'new@test.com', password: 'password', name: 'New User' })
      .end()

    expect(auth.handler).not.toHaveBeenCalled()
    expect(response.statusCode).toEqual(403)
    expect(response.json().message).toEqual('Registration is currently disabled')
  })

  it('should allow sign-up when registration is enabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: false, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: false, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: 3 })
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: 3 })
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
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })
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
          metadata: JSON.stringify({ organizationIds: ['org-1'] }),
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
      })
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
      })
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
      vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null })
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
