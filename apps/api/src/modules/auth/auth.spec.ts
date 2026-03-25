/**
 * Tests for the auth.ts module initialization.
 *
 * This file unmocks auth.ts and mocks all BetterAuth-related dependencies
 * to test module-level initialization (buildKeycloakPlugin, auth object
 * creation) without requiring a real database or Keycloak instance.
 */

// We need the real auth.ts, not the global auto-mock
vi.unmock('~/modules/auth/auth.js')

vi.mock('better-auth', () => ({
  betterAuth: vi.fn().mockImplementation((_cfg: Record<string, unknown>) => {
    return { handler: vi.fn(), api: { getSession: vi.fn() } }
  }),
}))

vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: vi.fn().mockReturnValue({}),
}))

// Track genericOAuth calls to verify keycloak plugin registration
const genericOAuthMock = vi.fn().mockReturnValue({ _type: 'keycloak-plugin' })
vi.mock('better-auth/plugins', () => ({
  bearer: vi.fn().mockReturnValue({}),
  admin: vi.fn().mockReturnValue({}),
  twoFactor: vi.fn().mockReturnValue({}),
  openAPI: vi.fn().mockReturnValue({}),
  jwt: vi.fn().mockReturnValue({}),
  organization: vi.fn().mockReturnValue({}),
  genericOAuth: genericOAuthMock,
}))

vi.mock('@better-auth/api-key', () => ({
  apiKey: vi.fn().mockReturnValue({}),
}))

vi.mock('~/prisma/clients.js', () => ({ db: {} }))
vi.mock('./redis.js', () => ({ buildSecondaryStorage: vi.fn().mockReturnValue({}) }))
vi.mock('./access-control.js', () => ({ ac: {}, adminRole: {}, memberRole: {}, ownerRole: {} }))

// Shared config defaults used across test suites
const baseAuthConfig = {
  secret: 'test-secret',
  baseUrl: 'http://localhost:8081',
  trustedOrigins: ['http://localhost:3000'],
  redisUrl: '',
  redisSentinelUrls: '',
  redisSentinelMaster: 'mymaster',
  redisPassword: '',
  redisSentinelPassword: '',
}

const baseKeycloakConfig = {
  enabled: false,
  clientId: '',
  clientSecret: '',
  issuer: '',
  publicUrl: '',
  mapRoles: false,
  mapGroups: false,
  mapOrgRoles: false,
  orgRolePrefix: 'org-',
  defaultOrgRole: 'member',
}

describe('auth module', () => {
  describe('when keycloak is disabled (default config)', () => {
    it('initializes the auth instance and calls betterAuth once', async () => {
      const { betterAuth } = await import('better-auth')
      const { auth } = await import('./auth.js')
      expect(auth).toBeDefined()
      expect(betterAuth).toHaveBeenCalledOnce()
    })

    it('does not register the keycloak/genericOAuth plugin', async () => {
      await import('./auth.js')
      expect(genericOAuthMock).not.toHaveBeenCalled()
    })
  })

  describe('when keycloak is enabled in config', () => {
    beforeEach(() => {
      vi.resetModules()
      vi.unmock('~/modules/auth/auth.js')
      genericOAuthMock.mockClear()
    })

    it('registers the genericOAuth (keycloak) plugin', async () => {
      vi.doMock('~/utils/config.js', () => ({
        config: {
          auth: baseAuthConfig,
          keycloak: {
            ...baseKeycloakConfig,
            enabled: true,
            clientId: 'my-client',
            clientSecret: 'my-secret',
            issuer: 'http://keycloak/realms/test',
          },
        },
      }))

      await import('./auth.js')
      expect(genericOAuthMock).toHaveBeenCalledOnce()
    })

    it('does not register the plugin when required keycloak fields are missing', async () => {
      vi.doMock('~/utils/config.js', () => ({
        config: {
          auth: baseAuthConfig,
          keycloak: {
            ...baseKeycloakConfig,
            enabled: true,
            clientId: '', // missing required field
            clientSecret: 'my-secret',
            issuer: 'http://keycloak',
          },
        },
      }))

      await import('./auth.js')
      expect(genericOAuthMock).not.toHaveBeenCalled()
    })
  })
})

describe('organization audit hooks', () => {
  const auditCreateMock = vi.fn().mockResolvedValue({ id: 'audit-1' })
  let databaseHooks: Record<string, Record<string, Record<string, (...args: unknown[]) => Promise<void>>>>

  beforeEach(async () => {
    vi.resetModules()
    vi.unmock('~/modules/auth/auth.js')
    auditCreateMock.mockClear()

    vi.doMock('~/prisma/clients.js', () => ({
      db: {
        auditLog: { create: auditCreateMock },
        organization: { findFirst: vi.fn() },
        member: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      },
    }))

    vi.doMock('~/utils/config.js', () => ({
      config: {
        auth: baseAuthConfig,
        keycloak: baseKeycloakConfig,
        modules: { auth: true, audit: true },
      },
    }))

    const { betterAuth } = await import('better-auth')
    await import('./auth.js')
    const cfg = (betterAuth as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>
    databaseHooks = cfg.databaseHooks as typeof databaseHooks
  })

  it('stashes org in pendingOrgCreations on organization.create.after', async () => {
    const { pendingOrgCreations } = await import('./auth.js')
    await databaseHooks.organization.create.after({ id: 'org-1', name: 'Test Org', slug: 'test-org' })
    expect(pendingOrgCreations.get('org-1')).toEqual({ id: 'org-1', name: 'Test Org', slug: 'test-org' })
  })

  it('emits audit log for org creation on member.create.after when org was just created', async () => {
    const { pendingOrgCreations } = await import('./auth.js')
    // Simulate org creation then owner member creation
    await databaseHooks.organization.create.after({ id: 'org-2', name: 'My Org', slug: 'my-org' })
    await databaseHooks.member.create.after({ userId: 'user-1', organizationId: 'org-2', role: 'owner' })

    expect(pendingOrgCreations.has('org-2')).toBe(false)
    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'create',
        resourceType: 'organization',
        resourceId: 'org-2',
        details: { name: 'My Org', slug: 'my-org' },
      },
    })
  })

  it('emits member:add audit for members added to existing orgs', async () => {
    await databaseHooks.member.create.after({ userId: 'user-2', organizationId: 'org-existing', role: 'member' })

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-2',
        action: 'member:add',
        resourceType: 'organization',
        resourceId: 'org-existing',
        details: { role: 'member' },
      },
    })
  })

  it('skips audit when audit module is disabled', async () => {
    vi.resetModules()
    vi.unmock('~/modules/auth/auth.js')
    auditCreateMock.mockClear()

    vi.doMock('~/prisma/clients.js', () => ({
      db: {
        auditLog: { create: auditCreateMock },
        organization: { findFirst: vi.fn() },
        member: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      },
    }))

    vi.doMock('~/utils/config.js', () => ({
      config: {
        auth: baseAuthConfig,
        keycloak: baseKeycloakConfig,
        modules: { auth: true, audit: false },
      },
    }))

    const { betterAuth } = await import('better-auth')
    await import('./auth.js')
    const calls = (betterAuth as ReturnType<typeof vi.fn>).mock.calls
    const cfg = calls[calls.length - 1]?.[0] as Record<string, unknown>
    const hooks = cfg.databaseHooks as typeof databaseHooks

    await hooks.organization.create.after({ id: 'org-3', name: 'No Audit', slug: 'no-audit' })
    await hooks.member.create.after({ userId: 'user-3', organizationId: 'org-3', role: 'owner' })

    expect(auditCreateMock).not.toHaveBeenCalled()
  })

  it('emits audit log for API key creation', async () => {
    await databaseHooks.apikey.create.after({ id: 'key-1', referenceId: 'user-1', name: 'My Key' })

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'create',
        resourceType: 'apikey',
        resourceId: 'key-1',
        details: { name: 'My Key' },
      },
    })
  })
})
