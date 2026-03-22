import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { themeMessages } from './constants.js'

vi.mock('~/database.js')

describe('[Theme] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('gET /api/v1/theme', () => {
    it('should return default theme when none persisted', async () => {
      db.webSetting.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/theme`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toStrictEqual({
        primaryColor: 'zinc',
        surfaceColor: 'zinc',
      })
    })

    it('should return persisted theme', async () => {
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

      const response = await app.inject()
        .get(`${apiPrefix.v1}/theme`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toStrictEqual(customTheme)
    })
  })

  describe('pUT /api/v1/theme', () => {
    it('should update theme when admin', async () => {
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

      const response = await app.inject()
        .put(`${apiPrefix.v1}/theme`)
        .body(newTheme)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().message).toEqual(themeMessages.updated)
      expect(response.json().data).toStrictEqual(newTheme)
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/theme`)
        .body({
          primaryColor: 'blue',
          surfaceColor: 'gray',
        })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual(themeMessages.forbidden)
      expect(response.json().error).toEqual('ADMIN_REQUIRED')
    })

    it('should return 400 for invalid body', async () => {
      const response = await app.inject()
        .put(`${apiPrefix.v1}/theme`)
        .body({ primaryColor: 'notacolor' })
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })
})
