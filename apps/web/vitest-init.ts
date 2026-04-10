import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Global auto-mock for the BetterAuth client.
//
// The real `~/lib/auth` calls `createAuthClient()` at module scope, which
// attempts HTTP requests to the API server (session check, CSRF token, etc.).
// In test (happy-dom) there is no server → ECONNREFUSED noise in stderr.
//
// This mock provides safe no-op defaults. Spec files that need specific
// mock behaviour can override with their own `vi.mock('~/lib/auth', ...)`.
// ---------------------------------------------------------------------------

const noopAsync = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: null }),
    signIn: { email: noopAsync, oauth2: noopAsync },
    signUp: { email: noopAsync },
    signOut: vi.fn().mockResolvedValue({}),
    organization: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      listUserInvitations: vi.fn().mockResolvedValue({ data: [] }),
      create: noopAsync,
      update: noopAsync,
      delete: noopAsync,
      setActive: noopAsync,
      getFullOrganization: noopAsync,
      inviteMember: noopAsync,
      removeMember: noopAsync,
      updateMemberRole: noopAsync,
      cancelInvitation: noopAsync,
      acceptInvitation: noopAsync,
      rejectInvitation: noopAsync,
    },
    admin: {
      listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
      setRole: noopAsync,
      banUser: noopAsync,
      unbanUser: noopAsync,
    },
    apiKey: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: noopAsync,
      delete: noopAsync,
    },
    useActiveOrganization: vi.fn().mockReturnValue({ data: { value: null }, isPending: { value: false } }),
    $fetch: vi.fn().mockResolvedValue({ data: null }),
  },
}))
