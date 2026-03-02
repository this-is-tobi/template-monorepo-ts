import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Default mock session attached to requests by the mock auth middleware.
 * Tests can override this by importing and modifying `mockSession`.
 */
export const mockSession = {
  user: {
    id: 'mock-user-id',
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
    userId: 'mock-user-id',
    token: 'mock-token',
    expiresAt: new Date(Date.now() + 86400000),
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
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
