import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'
import { getConfigQuery, getLockedConfigFields, getSsoProviders, invalidateConfigCache, upsertConfigQuery } from './queries.js'

vi.mock('~/database.js')
vi.mock('~/utils/config.js', () => ({
  config: {
    oidc: { enabled: false },
    auth: {},
    platform: undefined,
  },
}))
vi.mock('~/modules/auth/redis.js', () => ({
  getRedisClient: () => undefined,
}))

/**
 * Derived from the schema rather than written out, so adding a field to
 * `AppConfig` does not require touching every expectation in this file.
 */
const defaultConfig: AppConfig = AppConfigSchema.parse({})

/** Build a config object by overriding defaults. */
function appConfig(over: Partial<AppConfig> = {}): AppConfig {
  return { ...defaultConfig, ...over }
}

/** Stub a stored `web_setting` row holding an arbitrary JSON value. */
function storedRow(value: unknown) {
  return {
    key: 'config',
    value: value as JsonValue,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/** Temporarily pin platform overrides on the mocked server config. */
async function withPlatformOverrides(overrides: Record<string, unknown>, run: () => Promise<void>) {
  const configModule = await import('~/utils/config.js')
  const cfg = configModule.config as Record<string, unknown>
  const original = cfg.platform
  cfg.platform = overrides
  try {
    await invalidateConfigCache()
    await run()
  } finally {
    cfg.platform = original
    await invalidateConfigCache()
  }
}

describe('[Config] - Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await invalidateConfigCache()
  })

  describe('getLockedConfigFields', () => {
    it('should return empty array when no platform overrides are set', () => {
      expect(getLockedConfigFields()).toStrictEqual([])
    })

    it('should list only the fields an operator actually pinned', async () => {
      await withPlatformOverrides({ appName: 'Pinned', maintenanceMode: true }, async () => {
        expect(getLockedConfigFields().sort()).toStrictEqual(['appName', 'maintenanceMode'])
      })
    })
  })

  describe('getConfigQuery', () => {
    it('should return default config when no setting exists', async () => {
      dbRo.webSetting.findUnique.mockResolvedValueOnce(null)

      const result = await getConfigQuery()

      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(defaultConfig)
    })

    it('should return persisted config when setting exists', async () => {
      const customConfig = appConfig({
        enableRegistration: false,
        appName: 'My App',
        documentationUrl: 'https://docs.example.com',
      })
      dbRo.webSetting.findUnique.mockResolvedValueOnce(storedRow(customConfig))

      const result = await getConfigQuery()

      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(customConfig)
    })

    it('should fill in defaults for fields missing from an older stored row', async () => {
      // The column is untyped JSON: a row written before a field existed has
      // no key for it, which used to read back as `undefined` and leak into
      // behaviour like maintenance mode.
      dbRo.webSetting.findUnique.mockResolvedValueOnce(storedRow({ appName: 'Legacy' }))

      const result = await getConfigQuery()

      expect(result).toStrictEqual(appConfig({ appName: 'Legacy' }))
    })

    it('should fall back to defaults when the stored row is not valid config', async () => {
      dbRo.webSetting.findUnique.mockResolvedValueOnce(storedRow({ enableRegistration: 'yes please' }))

      const result = await getConfigQuery()

      expect(result).toStrictEqual(defaultConfig)
    })

    it('should hit DB on every call when no Redis is configured (no-op cache)', async () => {
      dbRo.webSetting.findUnique.mockResolvedValue(null)

      await getConfigQuery()
      await getConfigQuery()

      // No-op cache always misses → 2 DB lookups
      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should apply locked field overrides on top of DB config', async () => {
      await withPlatformOverrides({ enableRegistration: false }, async () => {
        dbRo.webSetting.findUnique.mockResolvedValueOnce(
          storedRow(appConfig({ enableRegistration: true })),
        )

        const result = await getConfigQuery()
        expect(result.enableRegistration).toBe(false)
      })
    })
  })

  describe('upsertConfigQuery', () => {
    it('should upsert config setting', async () => {
      const newConfig = appConfig({
        enableRegistration: false,
        allowOrganizationCreation: false,
        appName: 'Updated App',
        documentationUrl: 'https://docs.example.com',
        maintenanceMode: true,
      })
      db.webSetting.upsert.mockResolvedValueOnce(storedRow(newConfig))

      const result = await upsertConfigQuery(newConfig)

      expect(db.webSetting.upsert).toHaveBeenCalledTimes(1)
      expect(db.webSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'config' },
        create: { key: 'config', value: newConfig },
        update: { value: newConfig },
      })
      expect(result).toStrictEqual(newConfig)
    })

    it('should not persist env-locked fields, keeping the previously stored value', async () => {
      // A locked field arrives in the payload holding the env value, because
      // that is what the (disabled) form field showed. Writing it would bake a
      // copy of the override into the database and strand that stale value the
      // day the env var is removed.
      await withPlatformOverrides({ appName: 'Pinned By Env' }, async () => {
        db.webSetting.findUnique.mockResolvedValueOnce(
          storedRow(appConfig({ appName: 'Chosen In UI' })),
        )
        db.webSetting.upsert.mockImplementationOnce(async ({ update }: { update: { value: unknown } }) =>
          storedRow(update.value))

        const result = await upsertConfigQuery(appConfig({
          appName: 'Pinned By Env',
          maintenanceMode: true,
        }))

        const persisted = db.webSetting.upsert.mock.calls[0]![0].update.value as AppConfig
        expect(persisted.appName).toBe('Chosen In UI')
        // Unlocked fields still save normally.
        expect(persisted.maintenanceMode).toBe(true)
        // The response still reports the effective (overridden) value.
        expect(result.appName).toBe('Pinned By Env')
      })
    })
  })

  describe('getSsoProviders', () => {
    it('should return empty array when oidc is disabled', () => {
      expect(getSsoProviders()).toStrictEqual([])
    })
  })
})
