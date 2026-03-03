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
