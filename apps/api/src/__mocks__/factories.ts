/**
 * Shared mock factories for test files.
 * Provides consistent Prisma-shaped mock data across all test suites.
 */

/**
 * Build a full mock user record matching the Prisma User model.
 * All auth-managed fields are populated with sensible defaults.
 */
export function mockUser(overrides: { id: string, firstname: string, lastname: string, email: string, bio?: string | null }) {
  return {
    name: `${overrides.firstname} ${overrides.lastname}`,
    role: 'user' as const,
    emailVerified: false,
    image: null,
    banned: null,
    banReason: null,
    banExpires: null,
    twoFactorEnabled: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    bio: null,
    ...overrides,
  }
}
