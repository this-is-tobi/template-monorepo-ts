import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Stable IDs for the mock sessions — importable by test files.
 */
export const MOCK_ADMIN_ID = 'mock-user-id' // matches legacy mockSession.user.id
export const MOCK_USER_ID = 'mock-regular-user-id'

/**
 * Default mock session attached to requests by the mock auth middleware.
 * Defaults to admin role so existing tests that don't test ownership pass unchanged.
 */
export const mockSession = {
  user: {
    id: MOCK_ADMIN_ID,
    name: 'Test User',
    email: 'test@test.com',
    role: 'admin',
    emailVerified: true,
    image: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    banned: null,
    banReason: null,
    banExpires: null,
    firstname: 'Test',
    lastname: 'User',
    bio: null,
  },
  session: {
    id: 'mock-session-id',
    userId: MOCK_ADMIN_ID,
    token: 'mock-token',
    expiresAt: new Date(Date.now() + 86400000),
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

/**
 * Regular (non-admin) user session — use in tests that exercise ownership checks.
 */
export const mockUserSession = {
  ...mockSession,
  user: { ...mockSession.user, id: MOCK_USER_ID, role: 'user', name: 'Regular User', email: 'user@test.com' },
  session: { ...mockSession.session, id: 'mock-user-session-id', userId: MOCK_USER_ID },
}

/**
 * Mock requireAuth — attaches mockSession to the request without checking auth.
 */
export const requireAuth = vi.fn(async (req: FastifyRequest, _reply: FastifyReply) => {
  req.session = mockSession as any
})

/**
 * Mock requireRole — ignores role check, just attaches session.
 */
export function requireRole(..._roles: string[]) {
  return vi.fn(async (req: FastifyRequest, _reply: FastifyReply) => {
    req.session = mockSession as any
  })
}

/**
 * Mock isAdmin — reads role from req.session, matching the real implementation.
 */
export const isAdmin = vi.fn((req: FastifyRequest): boolean => {
  const rawRole = (req.session?.user as Record<string, unknown> | undefined)?.role as string | undefined
  const userRoles = rawRole ? rawRole.split(',').map(r => r.trim()) : []
  return userRoles.includes('admin')
})
