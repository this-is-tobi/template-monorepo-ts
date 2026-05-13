import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
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

describe('[Config] - Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await invalidateConfigCache()
  })

  const defaultConfig: AppConfig = {
    enableRegistration: true,
    allowOrganizationCreation: true,
    appName: 'Template Monorepo TS',
    documentationUrl: '',
    maintenanceMode: false,
    maxOrganizationsPerUser: null,
    maxProjectsPerOrg: null,
  }

  describe('getLockedConfigFields', () => {
    it('should return empty array when no platform overrides are set', () => {
      expect(getLockedConfigFields()).toStrictEqual([])
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
      const customConfig: AppConfig = {
        enableRegistration: false,
        allowOrganizationCreation: true,
        appName: 'My App',
        documentationUrl: 'https://docs.example.com',
        maintenanceMode: false,
        maxOrganizationsPerUser: null,
        maxProjectsPerOrg: null,
      }
      dbRo.webSetting.findUnique.mockResolvedValueOnce({
        key: 'config',
        value: customConfig as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getConfigQuery()

      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(customConfig)
    })

    it('should hit DB on every call when no Redis is configured (no-op cache)', async () => {
      dbRo.webSetting.findUnique.mockResolvedValue(null)

      await getConfigQuery()
      await getConfigQuery()

      // No-op cache always misses → 2 DB lookups
      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should apply locked field overrides on top of DB config', async () => {
      // Temporarily set appConfig on the mocked server config object
      const configModule = await import('~/utils/config.js')
      const cfg = configModule.config as Record<string, unknown>
      const originalPlatform = cfg.platform
      cfg.platform = { enableRegistration: false }

      try {
        await invalidateConfigCache()
        dbRo.webSetting.findUnique.mockResolvedValueOnce({
          key: 'config',
          value: { ...defaultConfig, enableRegistration: true } as unknown as JsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await getConfigQuery()
        expect(result.enableRegistration).toBe(false)
      } finally {
        cfg.platform = originalPlatform
      }
    })
  })

  describe('upsertConfigQuery', () => {
    it('should upsert config setting', async () => {
      const newConfig: AppConfig = {
        enableRegistration: false,
        allowOrganizationCreation: false,
        appName: 'Updated App',
        documentationUrl: 'https://docs.example.com',
        maintenanceMode: true,
        maxOrganizationsPerUser: null,
        maxProjectsPerOrg: null,
      }
      db.webSetting.upsert.mockResolvedValueOnce({
        key: 'config',
        value: newConfig as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await upsertConfigQuery(newConfig)

      expect(db.webSetting.upsert).toHaveBeenCalledTimes(1)
      expect(db.webSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'config' },
        create: { key: 'config', value: newConfig },
        update: { value: newConfig },
      })
      expect(result).toStrictEqual(newConfig)
    })
  })

  describe('getSsoProviders', () => {
    it('should return empty array when oidc is disabled', () => {
      expect(getSsoProviders()).toStrictEqual([])
    })
  })
})
