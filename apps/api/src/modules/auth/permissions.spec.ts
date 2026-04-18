import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Tests for the requirePermission middleware.
 *
 * Uses the REAL permissions module. Auth module is globally mocked
 * (vitest-init), so we re-mock specific imports to control behaviour.
 */

vi.unmock('~/modules/auth/permissions.js')
vi.unmock('~/modules/auth/middleware.js')

// Mock auth.ts to control hasPermission
vi.mock('~/modules/auth/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      hasPermission: vi.fn(),
    },
  },
}))

const { requirePermission, checkApiKeyScope } = await import('~/modules/auth/permissions.js')
const { auth } = await import('~/modules/auth/auth.js')

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockRequest(overrides?: Record<string, unknown>): FastifyRequest {
  return {
    headers: {},
    id: 'req-1',
    url: '/test',
    method: 'GET',
    params: {},
    routeOptions: { url: '/test' },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    server: { auditLogger: undefined, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
    session: undefined,
    ...overrides,
  } as unknown as FastifyRequest
}

function createMockReply(): FastifyReply {
  const reply = {
    sent: false,
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.sent = true
      return this
    }),
  }
  return reply as unknown as FastifyReply
}

const adminSession = {
  user: { id: 'admin-1', role: 'admin', name: 'Admin' },
  session: { id: 's-1', userId: 'admin-1', activeOrganizationId: undefined },
} as unknown

const memberSession = {
  user: { id: 'member-1', role: 'user', name: 'Member' },
  session: { id: 's-2', userId: 'member-1', activeOrganizationId: 'org-1' },
} as unknown

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when no session is present', async () => {
    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest()
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' })
  })

  it('should bypass for platform admin', async () => {
    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({ session: adminSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should allow when org-level permission check succeeds', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })

    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(auth.api.hasPermission).toHaveBeenCalledWith({
      headers: {},
      body: {
        userId: 'member-1',
        organizationId: 'org-1',
        permissions: { project: ['read'] },
      },
    })
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should deny when org-level permission check fails', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden', error: 'INSUFFICIENT_PERMISSIONS' })
  })

  it('should allow via ownership fallback when user is resource owner', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

    const handler = requirePermission({
      permissions: { project: ['read'] },
      getOwnerId: async () => 'member-1',
    })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should deny ownership fallback for non-ownership actions', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

    const handler = requirePermission({
      permissions: { project: ['create'] },
      getOwnerId: async () => 'member-1',
    })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    // 'create' is not in default ownership actions
    expect(reply.code).toHaveBeenCalledWith(403)
  })

  it('should deny when user is not resource owner', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

    const handler = requirePermission({
      permissions: { project: ['read'] },
      getOwnerId: async () => 'someone-else',
    })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).toHaveBeenCalledWith(403)
  })

  it('should use custom getOrganizationId when provided', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })

    const handler = requirePermission({
      permissions: { project: ['read'] },
      getOrganizationId: () => 'custom-org-id',
    })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(auth.api.hasPermission).toHaveBeenCalledWith({
      headers: {},
      body: {
        userId: 'member-1',
        organizationId: 'custom-org-id',
        permissions: { project: ['read'] },
      },
    })
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should support async getOrganizationId', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })

    const handler = requirePermission({
      permissions: { project: ['read'] },
      getOrganizationId: async () => 'async-org-id',
    })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(auth.api.hasPermission).toHaveBeenCalledWith({
      headers: {},
      body: {
        userId: 'member-1',
        organizationId: 'async-org-id',
        permissions: { project: ['read'] },
      },
    })
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should skip org check when no orgId is available', async () => {
    const noOrgSession = {
      user: { id: 'user-1', role: 'user', name: 'User' },
      session: { id: 's-3', userId: 'user-1' },
    } as unknown

    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({ session: noOrgSession })
    const reply = createMockReply()

    await handler(req, reply)

    expect(auth.api.hasPermission).not.toHaveBeenCalled()
    expect(reply.code).toHaveBeenCalledWith(403)
  })

  it('should handle hasPermission throwing gracefully', async () => {
    vi.mocked(auth.api.hasPermission).mockRejectedValueOnce(new Error('network error'))

    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    // hasPermission threw → treated as denied → falls through to deny
    expect(reply.code).toHaveBeenCalledWith(403)
  })

  it('should emit audit events when auditLogger is available', async () => {
    const logAsync = vi.fn()
    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({
      session: adminSession,
      server: { auditLogger: { logAsync }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
      params: { id: 'proj-123' },
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'project:create',
        resourceType: 'project',
        resourceId: 'proj-123',
        details: expect.objectContaining({
          granted: true,
          grantedBy: 'platform_admin',
        }),
      }),
    )
  })

  it('should allow via API key permissions when cached permissions match', async () => {
    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { project: ['read', 'create'] },
    })
    const reply = createMockReply()

    await handler(req, reply)

    // API key permissions match — no org check needed
    expect(auth.api.hasPermission).not.toHaveBeenCalled()
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should deny when API key permissions do not cover required actions and NOT fall through to org check', async () => {
    // Even when the underlying user has a passing org-level permission,
    // an API-key-authenticated request whose key explicitly does not
    // cover the action MUST be denied — API-key perms act as a cap, not
    // an additive shortcut.  Regression test for privilege escalation.
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })

    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { project: ['read'] },
      isApiKey: true,
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(auth.api.hasPermission).not.toHaveBeenCalled()
    expect(reply.code).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden', error: 'API_KEY_PERMISSIONS_DENIED' })
  })

  it('should allow fall-through when apiKeyPermissions is wildcard-only', async () => {
    // Wildcard-only API keys (e.g. `{ "*": ["*"] }`) impose no extra cap;
    // the request MAY fall through to org / ownership checks.
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })

    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({
      session: memberSession,
      // Doesn't grant 'create' directly, but resource is wildcard → fall through.
      apiKeyPermissions: { '*': ['read'] },
      isApiKey: true,
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(auth.api.hasPermission).toHaveBeenCalled()
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should still fall through when apiKeyPermissions is set but request is not API-key-authenticated', async () => {
    // Edge case: `apiKeyPermissions` is populated but `isApiKey` is false
    // (unusual; defensive). The cap only applies when the request is
    // actually API-key authenticated.
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null })

    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { project: ['read'] },
      // isApiKey not set → cap does not apply
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should support wildcard resource in API key permissions', async () => {
    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { '*': ['read'] },
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should support wildcard action in API key permissions', async () => {
    const handler = requirePermission({ project: ['create', 'delete'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { project: ['*'] },
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should emit audit with grantedBy api_key when API key permissions match', async () => {
    const logAsync = vi.fn()
    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({
      session: memberSession,
      server: { auditLogger: { logAsync }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
      apiKeyPermissions: { project: ['read'] },
    })
    const reply = createMockReply()

    await handler(req, reply)

    expect(logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          granted: true,
          grantedBy: 'api_key',
        }),
      }),
    )
  })

  it('should support custom ownershipActions', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

    const handler = requirePermission({
      permissions: { project: ['create'] },
      getOwnerId: async () => 'member-1',
      ownershipActions: ['create', 'read', 'update', 'delete'],
    })
    const req = createMockRequest({ session: memberSession })
    const reply = createMockReply()

    await handler(req, reply)

    // 'create' is now in custom ownership actions → allowed
    expect(reply.code).not.toHaveBeenCalled()
  })

  describe('project-member role check', () => {
    it('should allow via project-member role when org role denies', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const handler = requirePermission({
        permissions: { project: ['read'] },
        getProjectMemberRole: async () => 'member',
      })
      const req = createMockRequest({ session: memberSession })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should deny when project-member role does not cover required actions', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const handler = requirePermission({
        permissions: { project: ['delete'] },
        getProjectMemberRole: async () => 'member',
      })
      const req = createMockRequest({ session: memberSession })
      const reply = createMockReply()

      await handler(req, reply)

      // 'member' only grants read+update, not delete
      expect(reply.code).toHaveBeenCalledWith(403)
    })

    it('should allow project admin to delete', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const handler = requirePermission({
        permissions: { project: ['delete'] },
        getProjectMemberRole: async () => 'admin',
      })
      const req = createMockRequest({ session: memberSession })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should allow project owner all actions', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const handler = requirePermission({
        permissions: { project: ['create', 'read', 'update', 'delete'] },
        getProjectMemberRole: async () => 'owner',
      })
      const req = createMockRequest({ session: memberSession })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should only allow viewer to read', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const handler = requirePermission({
        permissions: { project: ['update'] },
        getProjectMemberRole: async () => 'viewer',
      })
      const req = createMockRequest({ session: memberSession })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
    })

    it('should emit audit with grantedBy project_member', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })
      const logAsync = vi.fn()

      const handler = requirePermission({
        permissions: { project: ['read'] },
        getProjectMemberRole: async () => 'viewer',
      })
      const req = createMockRequest({
        session: memberSession,
        server: { auditLogger: { logAsync }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(logAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            granted: true,
            grantedBy: 'project_member',
          }),
        }),
      )
    })

    it('should skip project-member check when role is undefined', async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

      const handler = requirePermission({
        permissions: { project: ['read'] },
        getProjectMemberRole: async () => undefined,
      })
      const req = createMockRequest({ session: memberSession })
      const reply = createMockReply()

      await handler(req, reply)

      // No project member role → falls through to deny
      expect(reply.code).toHaveBeenCalledWith(403)
    })
  })

  describe('api key scope enforcement', () => {
    it('should deny when org scope is set and target org does not match', async () => {
      const handler = requirePermission({ project: ['read'] })
      const req = createMockRequest({
        session: memberSession,
        apiKeyPermissions: { project: ['read'] },
        apiKeyScope: { organizationIds: new Set(['org-other']) },
      })
      const reply = createMockReply()

      await handler(req, reply)

      // memberSession has activeOrganizationId 'org-1' which is not in scope
      expect(reply.code).toHaveBeenCalledWith(403)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden', error: 'API_KEY_SCOPE_DENIED' })
    })

    it('should allow when org scope matches', async () => {
      const handler = requirePermission({ project: ['read'] })
      const req = createMockRequest({
        session: memberSession,
        apiKeyPermissions: { project: ['read'] },
        apiKeyScope: { organizationIds: new Set(['org-1']) },
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should deny when project scope is set and target project does not match', async () => {
      const handler = requirePermission({
        permissions: { project: ['read'] },
        getProjectId: () => 'proj-999',
      })
      const req = createMockRequest({
        session: memberSession,
        apiKeyPermissions: { project: ['read'] },
        apiKeyScope: { projectIds: new Set(['proj-1', 'proj-2']) },
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden', error: 'API_KEY_SCOPE_DENIED' })
    })

    it('should allow when project scope matches', async () => {
      const handler = requirePermission({
        permissions: { project: ['read'] },
        getProjectId: () => 'proj-1',
      })
      const req = createMockRequest({
        session: memberSession,
        apiKeyPermissions: { project: ['read'] },
        apiKeyScope: { projectIds: new Set(['proj-1', 'proj-2']) },
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should allow when scope is set but route has no target org/project', async () => {
      const handler = requirePermission({ project: ['read'] })
      const noOrgSession = {
        user: { id: 'user-1', role: 'user', name: 'User' },
        session: { id: 's-3', userId: 'user-1' },
      } as unknown
      const req = createMockRequest({
        session: noOrgSession,
        apiKeyPermissions: { project: ['create'] },
        apiKeyScope: { organizationIds: new Set(['org-1']) },
      })
      const reply = createMockReply()

      await handler(req, reply)

      // No org on the request → scope check passes (non-scoped route),
      // but API key perms don't cover 'read', no org → falls through to deny
      expect(reply.code).toHaveBeenCalledWith(403)
      // Not scope denied — it's a permission deny
      expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden', error: 'INSUFFICIENT_PERMISSIONS' })
    })

    it('should deny when both scopes set and org matches but project does not', async () => {
      const handler = requirePermission({
        permissions: { project: ['read'] },
        getProjectId: () => 'proj-bad',
      })
      const req = createMockRequest({
        session: memberSession,
        apiKeyPermissions: { project: ['read'] },
        apiKeyScope: { organizationIds: new Set(['org-1']), projectIds: new Set(['proj-1']) },
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden', error: 'API_KEY_SCOPE_DENIED' })
    })
  })

  describe('audit authMethod tracking', () => {
    it('should include authMethod=api_key when request is API key authenticated', async () => {
      const logAsync = vi.fn()
      const handler = requirePermission({ project: ['read'] })
      const req = createMockRequest({
        session: memberSession,
        server: { auditLogger: { logAsync }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
        apiKeyPermissions: { project: ['read'] },
        isApiKey: true,
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(logAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            authMethod: 'api_key',
          }),
        }),
      )
    })

    it('should include authMethod=session when request is session authenticated', async () => {
      const logAsync = vi.fn()
      const handler = requirePermission({ project: ['create'] })
      const req = createMockRequest({
        session: adminSession,
        server: { auditLogger: { logAsync }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } },
      })
      const reply = createMockReply()

      await handler(req, reply)

      expect(logAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            authMethod: 'session',
          }),
        }),
      )
    })
  })
})

describe('checkApiKeyScope', () => {
  it('should allow when scope is empty (unrestricted)', () => {
    expect(checkApiKeyScope({}, { organizationId: 'org-1', projectId: 'proj-1' })).toBe(true)
  })

  it('should allow when org is in scope', () => {
    expect(checkApiKeyScope({ organizationIds: new Set(['org-1', 'org-2']) }, { organizationId: 'org-1' })).toBe(true)
  })

  it('should deny when org is not in scope', () => {
    expect(checkApiKeyScope({ organizationIds: new Set(['org-1']) }, { organizationId: 'org-other' })).toBe(false)
  })

  it('should deny when org scope is empty set (deny-all)', () => {
    expect(checkApiKeyScope({ organizationIds: new Set() }, { organizationId: 'org-1' })).toBe(false)
  })

  it('should allow when project is in scope', () => {
    expect(checkApiKeyScope({ projectIds: new Set(['proj-1']) }, { projectId: 'proj-1' })).toBe(true)
  })

  it('should deny when project is not in scope', () => {
    expect(checkApiKeyScope({ projectIds: new Set(['proj-1']) }, { projectId: 'proj-2' })).toBe(false)
  })

  it('should allow when target has no org/project (non-scoped route)', () => {
    expect(checkApiKeyScope({ organizationIds: new Set(['org-1']), projectIds: new Set(['proj-1']) }, {})).toBe(true)
  })

  it('should check both dimensions independently', () => {
    const scope = { organizationIds: new Set(['org-1']), projectIds: new Set(['proj-1']) }
    expect(checkApiKeyScope(scope, { organizationId: 'org-1', projectId: 'proj-1' })).toBe(true)
    expect(checkApiKeyScope(scope, { organizationId: 'org-1', projectId: 'proj-2' })).toBe(false)
    expect(checkApiKeyScope(scope, { organizationId: 'org-2', projectId: 'proj-1' })).toBe(false)
  })
})
