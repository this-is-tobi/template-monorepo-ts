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

vi.mock('better-auth/plugins/generic-oauth', () => ({
  keycloak: vi.fn().mockReturnValue({ clientId: 'test', clientSecret: 'test', issuer: 'http://kc' }),
}))

vi.mock('@better-auth/api-key', () => ({
  apiKey: vi.fn().mockReturnValue({}),
}))

vi.mock('~/prisma/clients.js', () => ({ db: {} }))
vi.mock('./redis.js', () => ({ buildSecondaryStorage: vi.fn().mockReturnValue({}) }))
vi.mock('./access-control.js', () => ({ ac: {}, adminRole: {}, memberRole: {}, ownerRole: {} }))

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
          auth: {
            secret: 'test-secret',
            baseUrl: 'http://localhost:8081',
            trustedOrigins: ['http://localhost:3000'],
            redisUrl: '',
            redisSentinelUrls: '',
            redisSentinelMaster: 'mymaster',
            redisPassword: '',
            redisSentinelPassword: '',
          },
          keycloak: {
            enabled: true,
            clientId: 'my-client',
            clientSecret: 'my-secret',
            issuer: 'http://keycloak/realms/test',
            mapRoles: false,
            mapGroups: false,
          },
        },
      }))

      await import('./auth.js')
      expect(genericOAuthMock).toHaveBeenCalledOnce()
    })

    it('does not register the plugin when required keycloak fields are missing', async () => {
      vi.doMock('~/utils/config.js', () => ({
        config: {
          auth: {
            secret: 'test-secret',
            baseUrl: 'http://localhost:8081',
            trustedOrigins: ['http://localhost:3000'],
            redisUrl: '',
            redisSentinelUrls: '',
            redisSentinelMaster: 'mymaster',
            redisPassword: '',
            redisSentinelPassword: '',
          },
          keycloak: {
            enabled: true,
            clientId: '', // missing required field
            clientSecret: 'my-secret',
            issuer: 'http://keycloak',
            mapRoles: false,
            mapGroups: false,
          },
        },
      }))

      await import('./auth.js')
      expect(genericOAuthMock).not.toHaveBeenCalled()
    })
  })
})
