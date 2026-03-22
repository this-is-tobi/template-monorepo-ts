import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { getConfigQuery, getSsoProviders, invalidateConfigCache, upsertConfigQuery } from './queries.js'

vi.mock('~/database.js')
vi.mock('~/utils/config.js', () => ({
  config: {
    keycloak: { enabled: false },
  },
}))

describe('[Config] - Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateConfigCache()
  })

  const defaultConfig: AppConfig = {
    enableRegistration: true,
    allowOrganizationCreation: true,
    appName: 'Template Monorepo TS',
    documentationUrl: '',
    maintenanceMode: false,
  }

  describe('getConfigQuery', () => {
    it('should return default config when no setting exists', async () => {
      db.webSetting.findUnique.mockResolvedValueOnce(null)

      const result = await getConfigQuery()

      expect(db.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(defaultConfig)
    })

    it('should return persisted config when setting exists', async () => {
      const customConfig: AppConfig = {
        enableRegistration: false,
        allowOrganizationCreation: true,
        appName: 'My App',
        documentationUrl: 'https://docs.example.com',
        maintenanceMode: false,
      }
      db.webSetting.findUnique.mockResolvedValueOnce({
        key: 'config',
        value: customConfig as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getConfigQuery()

      expect(db.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(customConfig)
    })

    it('should return cached config on subsequent calls', async () => {
      db.webSetting.findUnique.mockResolvedValueOnce(null)

      await getConfigQuery()
      await getConfigQuery()

      expect(db.webSetting.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('upsertConfigQuery', () => {
    it('should upsert config setting and refresh cache', async () => {
      const newConfig: AppConfig = {
        enableRegistration: false,
        allowOrganizationCreation: false,
        appName: 'Updated App',
        documentationUrl: 'https://docs.example.com',
        maintenanceMode: true,
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

      // Subsequent getConfigQuery should use cache (no DB call)
      const cached = await getConfigQuery()
      expect(db.webSetting.findUnique).not.toHaveBeenCalled()
      expect(cached).toStrictEqual(newConfig)
    })
  })

  describe('getSsoProviders', () => {
    it('should return empty array when keycloak is disabled', () => {
      expect(getSsoProviders()).toStrictEqual([])
    })
  })
})
