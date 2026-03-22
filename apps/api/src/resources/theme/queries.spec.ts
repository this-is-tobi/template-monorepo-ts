import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { getThemeQuery, upsertThemeQuery } from './queries.js'

vi.mock('~/database.js')

describe('[Theme] - Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultTheme: ThemeConfig = {
    primaryColor: 'zinc',
    surfaceColor: 'zinc',
  }

  describe('getThemeQuery', () => {
    it('should return default theme when no setting exists', async () => {
      db.webSetting.findUnique.mockResolvedValueOnce(null)

      const result = await getThemeQuery()

      expect(db.webSetting.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(defaultTheme)
    })

    it('should return persisted theme when setting exists', async () => {
      const customTheme: ThemeConfig = {
        primaryColor: 'indigo',
        surfaceColor: 'slate',
      }
      db.webSetting.findUnique.mockResolvedValueOnce({
        key: 'theme',
        value: customTheme as unknown as JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getThemeQuery()

      expect(db.webSetting.findUnique).toHaveBeenCalledTimes(1)
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
