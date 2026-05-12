import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'
import { getThemeQuery, invalidateThemeCache, upsertThemeQuery } from './queries.js'

vi.mock('~/database.js')
vi.mock('~/utils/config.js', () => ({
  config: {
    auth: {},
  },
}))
vi.mock('~/modules/auth/redis.js', () => ({
  getRedisClient: () => undefined,
}))

describe('[Theme] - Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await invalidateThemeCache()
  })

  const defaultTheme: ThemeConfig = {
    primaryColor: 'zinc',
    surfaceColor: 'zinc',
  }

  describe('getThemeQuery', () => {
    it('should return default theme when no setting exists', async () => {
      dbRo.webSetting.findUnique.mockResolvedValueOnce(null)

      const result = await getThemeQuery()

      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(defaultTheme)
    })

    it('should return persisted theme when setting exists', async () => {
      const customTheme: ThemeConfig = {
        primaryColor: 'indigo',
        surfaceColor: 'slate',
      }
      dbRo.webSetting.findUnique.mockResolvedValueOnce({
        key: 'theme',
        value: customTheme as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getThemeQuery()

      expect(dbRo.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(customTheme)
    })
  })

  describe('upsertThemeQuery', () => {
    it('should upsert theme setting', async () => {
      const newTheme: ThemeConfig = {
        primaryColor: 'blue',
        surfaceColor: 'gray',
      }
      db.webSetting.upsert.mockResolvedValueOnce({
        key: 'theme',
        value: newTheme as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await upsertThemeQuery(newTheme)

      expect(db.webSetting.upsert).toHaveBeenCalledTimes(1)
      expect(db.webSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'theme' },
        create: { key: 'theme', value: newTheme },
        update: { value: newTheme },
      })
      expect(result).toStrictEqual(newTheme)
    })
  })
})
