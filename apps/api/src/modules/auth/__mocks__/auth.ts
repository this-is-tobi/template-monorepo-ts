/**
 * Mock BetterAuth instance for unit tests.
 * Prevents actual auth initialization (Redis, Prisma adapter, etc.).
 */
export const ac = {
  newRole: vi.fn().mockReturnValue({}),
} as any

export const ownerRole = {}
export const adminRole = {}
export const memberRole = {}

export const auth = {
  handler: vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
  api: {
    getSession: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue({ id: 'new-admin-id', email: 'admin@example.com', role: 'admin' }),
  },
} as any

export type Auth = typeof auth
export interface Session {
  user: {
    id: string
    name: string
    email: string
    role: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
    banned: boolean | null
    banReason: string | null
    banExpires: Date | null
    firstname: string
    lastname: string
    bio: string | null
  }
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
    updatedAt: Date
  }
}
