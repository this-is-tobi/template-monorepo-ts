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

const { requirePermission } = await import('~/modules/auth/permissions.js')
const { auth } = await import('~/modules/auth/auth.js')

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockRequest(overrides?: Partial<FastifyRequest> & { session?: unknown }): FastifyRequest {
  return {
    headers: {},
    id: 'req-1',
    url: '/test',
    method: 'GET',
    params: {},
    routeOptions: { url: '/test' },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    server: { auditLogger: undefined },
    session: undefined as any,
    ...overrides,
  } as unknown as FastifyRequest
}

function createMockReply(): FastifyReply {
  const reply = {
    sent: false,
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockImplementation(function (this: any) {
      this.sent = true
      return this
    }),
  }
  return reply as unknown as FastifyReply
}

const adminSession = {
  user: { id: 'admin-1', role: 'admin', name: 'Admin' },
  session: { id: 's-1', userId: 'admin-1', activeOrganizationId: undefined },
} as any

const memberSession = {
  user: { id: 'member-1', role: 'user', name: 'Member' },
  session: { id: 's-2', userId: 'member-1', activeOrganizationId: 'org-1' },
} as any

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
      body: {
        userId: 'member-1',
        organizationId: 'org-1',
        permission: { project: ['read'] },
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
      body: {
        userId: 'member-1',
        organizationId: 'custom-org-id',
        permission: { project: ['read'] },
      },
    })
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should skip org check when no orgId is available', async () => {
    const noOrgSession = {
      user: { id: 'user-1', role: 'user', name: 'User' },
      session: { id: 's-3', userId: 'user-1' },
    } as any

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
      server: { auditLogger: { logAsync } },
      params: { id: 'proj-123' },
    } as any)
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
    } as any)
    const reply = createMockReply()

    await handler(req, reply)

    // API key permissions match — no org check needed
    expect(auth.api.hasPermission).not.toHaveBeenCalled()
    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should deny when API key permissions do not cover required actions', async () => {
    vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null })

    const handler = requirePermission({ project: ['create'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { project: ['read'] },
    } as any)
    const reply = createMockReply()

    await handler(req, reply)

    // API key doesn't cover 'create' → falls through to org check → denied
    expect(reply.code).toHaveBeenCalledWith(403)
  })

  it('should support wildcard resource in API key permissions', async () => {
    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { '*': ['read'] },
    } as any)
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should support wildcard action in API key permissions', async () => {
    const handler = requirePermission({ project: ['create', 'delete'] })
    const req = createMockRequest({
      session: memberSession,
      apiKeyPermissions: { project: ['*'] },
    } as any)
    const reply = createMockReply()

    await handler(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('should emit audit with grantedBy api_key when API key permissions match', async () => {
    const logAsync = vi.fn()
    const handler = requirePermission({ project: ['read'] })
    const req = createMockRequest({
      session: memberSession,
      server: { auditLogger: { logAsync } },
      apiKeyPermissions: { project: ['read'] },
    } as any)
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
})
