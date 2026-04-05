import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Tests for auth middleware.
 *
 * These tests use the REAL middleware module (not the mock).
 * We mock the auth.ts dependency instead to control session resolution.
 */

// We need to unmock middleware for this test file
// but keep auth.ts mocked (it's mocked globally in vitest-init)
vi.unmock('~/modules/auth/middleware.js')

// Re-import the real module after unmocking
const { requireAuth, requireRole, isAdmin } = await import('~/modules/auth/middleware.js')
const { auth } = await import('~/modules/auth/auth.js')

function createMockRequest(overrides?: Partial<FastifyRequest>): FastifyRequest {
  return {
    headers: { authorization: 'Bearer mock-token' },
    id: 'req-1',
    url: '/test',
    method: 'GET',
    routeOptions: { url: '/test' },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    session: undefined,
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

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@test.com',
    role: 'admin',
    emailVerified: true,
  },
  session: {
    id: 'session-1',
    userId: 'user-1',
    token: 'token-1',
    expiresAt: new Date(Date.now() + 86400000),
  },
}

/** Builds a valid `Omit<ApiKey, 'key'>` with sensible defaults. */
function createMockApiKey(overrides?: Record<string, unknown>) {
  return {
    id: 'key-1',
    configId: 'default',
    name: null,
    start: null,
    prefix: null,
    referenceId: 'user-1',
    refillInterval: null,
    refillAmount: null,
    lastRefillAt: null,
    enabled: true,
    rateLimitEnabled: false,
    rateLimitTimeWindow: null,
    rateLimitMax: null,
    requestCount: 0,
    remaining: null,
    lastRequest: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: null,
    permissions: null as Record<string, string[]> | null,
    ...overrides,
  }
}

describe('auth-middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should attach session to request when valid', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(auth.api.getSession).toHaveBeenCalledTimes(1)
      expect(req.session).toEqual(mockSession)
      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should return 401 when no session found', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      const req = createMockRequest()
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(reply.code).toHaveBeenCalledWith(401)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' })
      expect(req.session).toBeUndefined()
    })

    it('should return 401 when getSession throws', async () => {
      vi.mocked(auth.api.getSession).mockRejectedValueOnce(new Error('session error'))
      const req = createMockRequest()
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(reply.code).toHaveBeenCalledWith(401)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' })
    })

    it('should handle non-Error rejections (String path in log)', async () => {
      vi.mocked(auth.api.getSession).mockRejectedValueOnce('plain string error')
      const req = createMockRequest()
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(reply.code).toHaveBeenCalledWith(401)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' })
    })

    it('should authenticate via API key when no session and x-api-key header present', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockResolvedValueOnce({
        valid: true,
        error: null,
        key: createMockApiKey({ referenceId: 'user-1', permissions: { project: ['read'] } }),
      })
      const req = createMockRequest({
        headers: { 'x-api-key': 'test-api-key' },
      })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(auth.api.verifyApiKey).toHaveBeenCalledWith({ body: { key: 'test-api-key' } })
      expect(req.session).toBeDefined()
      expect((req.session!.user as Record<string, unknown>).id).toBe('user-1')
      expect(req.apiKeyPermissions).toEqual({ project: ['read'] })
      expect(req.isApiKey).toBe(true)
      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should set activeOrganizationId from first entry in organizationIds', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockResolvedValueOnce({
        valid: true,
        error: null,
        key: createMockApiKey({
          referenceId: 'user-1',
          permissions: { project: ['read'] },
          metadata: JSON.stringify({ organizationIds: ['org-xyz', 'org-abc'] }),
        }),
      })
      const req = createMockRequest({ headers: { 'x-api-key': 'scoped-key' } })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(req.session).toBeDefined()
      const session = req.session!.session as Record<string, unknown>
      expect(session.activeOrganizationId).toBe('org-xyz')
      expect(req.apiKeyPermissions).toEqual({ project: ['read'] })
    })

    it('should populate apiKeyScope from metadata organizationIds and projectIds', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockResolvedValueOnce({
        valid: true,
        error: null,
        key: createMockApiKey({
          referenceId: 'user-1',
          permissions: null,
          metadata: JSON.stringify({ organizationIds: ['org-1', 'org-2'], projectIds: ['proj-1'] }),
        }),
      })
      const req = createMockRequest({ headers: { 'x-api-key': 'scoped-key' } })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(req.apiKeyScope).toBeDefined()
      expect(req.apiKeyScope!.organizationIds).toEqual(new Set(['org-1', 'org-2']))
      expect(req.apiKeyScope!.projectIds).toEqual(new Set(['proj-1']))
    })

    it('should not set activeOrganizationId when API key has no org metadata', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockResolvedValueOnce({
        valid: true,
        error: null,
        key: createMockApiKey({ referenceId: 'user-1', permissions: { project: ['read'] } }),
      })
      const req = createMockRequest({ headers: { 'x-api-key': 'global-key' } })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(req.session).toBeDefined()
      const session = req.session!.session as Record<string, unknown>
      expect(session.activeOrganizationId).toBeUndefined()
      expect(req.apiKeyScope).toBeUndefined()
    })

    it('should handle API key with null permissions', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockResolvedValueOnce({
        valid: true,
        error: null,
        key: createMockApiKey({ id: 'key-2', referenceId: 'user-2' }),
      })
      const req = createMockRequest({
        headers: { 'x-api-key': 'test-key-2' },
      })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(req.session).toBeDefined()
      expect(req.apiKeyPermissions).toBeNull()
    })

    it('should return 401 when API key is invalid', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockResolvedValueOnce({
        valid: false,
        error: null,
        key: null,
      })
      const req = createMockRequest({
        headers: { 'x-api-key': 'bad-key' },
      })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(reply.code).toHaveBeenCalledWith(401)
    })

    it('should return 401 when verifyApiKey throws', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      vi.mocked(auth.api.verifyApiKey).mockRejectedValueOnce(new Error('verify error'))
      const req = createMockRequest({
        headers: { 'x-api-key': 'test-key' },
      })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(reply.code).toHaveBeenCalledWith(401)
    })

    it('should prefer session auth over API key when both present', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any)
      const req = createMockRequest({
        headers: { authorization: 'Bearer mock-token', 'x-api-key': 'test-key' },
      })
      const reply = createMockReply()

      await requireAuth(req, reply)

      expect(auth.api.verifyApiKey).not.toHaveBeenCalled()
      expect(req.session).toEqual(mockSession)
      expect(req.apiKeyPermissions).toBeUndefined()
      expect(req.isApiKey).toBeUndefined()
    })
  })

  describe('requireRole', () => {
    it('should pass when user has the required role', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('admin')
      await handler(req, reply)

      expect(req.session).toEqual(mockSession)
      expect(reply.code).not.toHaveBeenCalledWith(403)
    })

    it('should return 403 when user lacks the required role', async () => {
      const userSession = {
        ...mockSession,
        user: { ...mockSession.user, role: 'user' },
      }
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(userSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('admin')
      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
      expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden' })
    })

    it('should return 403 and log "none" when user has no role', async () => {
      const noRoleSession = {
        ...mockSession,
        user: { ...mockSession.user, role: undefined },
      }
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(noRoleSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('admin')
      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
    })

    it('should accept any of multiple roles', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('user', 'admin')
      await handler(req, reply)

      expect(req.session).toEqual(mockSession)
      expect(reply.code).not.toHaveBeenCalledWith(403)
    })

    it('should handle comma-separated multi-role values', async () => {
      const multiRoleSession = {
        ...mockSession,
        user: { ...mockSession.user, role: 'user,admin' },
      }
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(multiRoleSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('admin')
      await handler(req, reply)

      expect(req.session).toEqual(multiRoleSession)
      expect(reply.code).not.toHaveBeenCalledWith(403)
    })

    it('should reject comma-separated roles when none match', async () => {
      const multiRoleSession = {
        ...mockSession,
        user: { ...mockSession.user, role: 'user,viewer' },
      }
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(multiRoleSession as any)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('admin')
      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
    })

    it('should return 401 if auth fails before role check', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
      const req = createMockRequest()
      const reply = createMockReply()

      const handler = requireRole('admin')
      await handler(req, reply)

      expect(reply.code).toHaveBeenCalledWith(401)
      // Should not reach 403 since auth failed first
      expect(reply.code).not.toHaveBeenCalledWith(403)
    })
  })
  describe('isAdmin', () => {
    it('should return true when user has admin role', () => {
      const req = createMockRequest()
      req.session = { ...mockSession, user: { ...mockSession.user, role: 'admin' } } as any

      expect(isAdmin(req)).toBe(true)
    })

    it('should return false when user has non-admin role', () => {
      const req = createMockRequest()
      req.session = { ...mockSession, user: { ...mockSession.user, role: 'user' } } as any

      expect(isAdmin(req)).toBe(false)
    })

    it('should return true for comma-separated roles containing admin', () => {
      const req = createMockRequest()
      req.session = { ...mockSession, user: { ...mockSession.user, role: 'user,admin' } } as any

      expect(isAdmin(req)).toBe(true)
    })

    it('should return false when session is missing', () => {
      const req = createMockRequest()
      req.session = undefined

      expect(isAdmin(req)).toBe(false)
    })
  })
})
