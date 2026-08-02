import type { AppConfig, RuntimeConfigEntry } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { apiPrefix, AppConfigSchema } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'
import { configMessages } from './constants.js'
import { invalidateConfigCache } from './queries.js'

vi.mock('~/database.js')
vi.mock('~/utils/config.js', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>
  return {
    ...original,
    config: {
      ...(original as { config: Record<string, unknown> }).config,
      oidc: { enabled: true },
    },
  }
})

/** Derived from the schema so adding a field does not break every expectation. */
const defaultConfig: AppConfig = AppConfigSchema.parse({})

/** Build a config object by overriding defaults. */
function appConfig(over: Partial<AppConfig> = {}): AppConfig {
  return { ...defaultConfig, ...over }
}

describe('[Config] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateConfigCache()
  })

  describe('gET /api/v1/config', () => {
    it('should return default config when none persisted', async () => {
      dbRo.webSetting.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/config`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toStrictEqual(defaultConfig)
      expect(response.json().ssoProviders).toStrictEqual(['keycloak'])
      expect(response.json().lockedFields).toStrictEqual([])
    })

    it('should return persisted config', async () => {
      const customConfig = appConfig({ enableRegistration: false, appName: 'My App' })
      dbRo.webSetting.findUnique.mockResolvedValueOnce({
        key: 'config',
        value: customConfig as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/config`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toStrictEqual(customConfig)
      expect(response.json().ssoProviders).toStrictEqual(['keycloak'])
      expect(response.json().lockedFields).toStrictEqual([])
    })
  })

  describe('pUT /api/v1/config', () => {
    it('should update config when admin', async () => {
      const newConfig = appConfig({
        enableRegistration: false,
        allowOrganizationCreation: false,
        appName: 'Updated App',
        documentationUrl: 'https://docs.example.com',
        maintenanceMode: true,
      })
      db.webSetting.upsert.mockResolvedValueOnce({
        key: 'config',
        value: newConfig as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/config`)
        .body(newConfig)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().message).toEqual(configMessages.updated)
      expect(response.json().data).toStrictEqual(newConfig)
    })

    it('should return 403 for a non-admin, whatever their organization role', async () => {
      // Regression: platform config used to be writable through the
      // org-level `config:update` permission, which every user holds as
      // owner of their auto-created personal org — so any account could
      // flip maintenance mode. It is now gated on the platform admin role.
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/config`)
        .body({ enableRegistration: false })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Forbidden')
      expect(db.webSetting.upsert).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid body', async () => {
      const response = await app.inject()
        .put(`${apiPrefix.v1}/config`)
        .body({ enableRegistration: 'not-a-boolean' })
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('gET /api/v1/config/runtime', () => {
    it('should describe every option with its resolved source', async () => {
      const response = await app.inject()
        .get(`${apiPrefix.v1}/config/runtime`)
        .end()

      expect(response.statusCode).toEqual(200)
      const entries = response.json().entries as RuntimeConfigEntry[]

      // The test suite boots from `configs/config.valid.spec.json`, so
      // options it sets are attributed to the file layer.
      const port = entries.find(e => e.path === 'server.port')
      expect(port).toMatchObject({ envVar: 'SERVER__PORT', source: 'file', value: '5555' })

      // Nested leaves keep their full path, never just the last segment.
      expect(entries.find(e => e.path === 'server.rateLimit.max')?.envVar).toBe('SERVER__RATE_LIMIT__MAX')
      // Intermediate objects are not options.
      expect(entries.some(e => e.path === 'server.rateLimit')).toBe(false)
    })

    it('should never disclose secret values', async () => {
      const response = await app.inject()
        .get(`${apiPrefix.v1}/config/runtime`)
        .end()

      const entries = response.json().entries as RuntimeConfigEntry[]
      const secrets = entries.filter(e => e.secret)

      // Named secrets plus connection strings that embed credentials.
      expect(secrets.map(e => e.path)).toEqual(expect.arrayContaining([
        'auth.secret',
        'db.url',
        'db.readUrl',
        'oidc.clientSecret',
        'bootstrap.password',
        'auth.redis.password',
      ]))
      for (const entry of secrets) {
        expect(entry.value).toBeNull()
      }
      // …and the raw payload carries no trace of the resolved secret.
      expect(response.body).not.toContain('change-me-in-production')
    })

    it('should omit platform overrides that were never pinned', async () => {
      // An unset `platform.*` leaf is not a "default" — it defers to the
      // database-backed AppConfig, and reporting it as default would lie.
      const response = await app.inject()
        .get(`${apiPrefix.v1}/config/runtime`)
        .end()

      const entries = response.json().entries as RuntimeConfigEntry[]
      expect(entries.some(e => e.path.startsWith('platform.'))).toBe(false)
    })

    it('should include telemetry, which is configured outside ConfigSchema', async () => {
      // `OTEL_*` keeps its SDK-standard spelling and never reaches the `__`
      // prefix parser, so it would be invisible here unless explicitly added —
      // leaving a hole in the one view that answers "did my env var land?".
      const response = await app.inject()
        .get(`${apiPrefix.v1}/config/runtime`)
        .end()

      const entries = response.json().entries as RuntimeConfigEntry[]
      expect(entries.find(e => e.path === 'otel.exporterOtlpEndpoint')?.envVar).toBe('OTEL_EXPORTER_OTLP_ENDPOINT')
      expect(entries.filter(e => e.path.startsWith('otel.'))).toHaveLength(4)
    })

    it('should return 403 for a non-admin — it exposes deployment topology', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/config/runtime`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})
