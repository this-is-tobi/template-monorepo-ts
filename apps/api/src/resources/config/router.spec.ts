import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { apiPrefix } from '@template-monorepo-ts/shared'
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
      expect(response.json().data).toStrictEqual({
        enableRegistration: true,
        allowOrganizationCreation: true,
        appName: 'Template Monorepo TS',
        documentationUrl: '',
        maintenanceMode: false,
        maxOrganizationsPerUser: null,
        maxProjectsPerOrg: null,
      })
      expect(response.json().ssoProviders).toStrictEqual(['keycloak'])
      expect(response.json().lockedFields).toStrictEqual([])
    })

    it('should return persisted config', async () => {
      const customConfig: AppConfig = {
        enableRegistration: false,
        allowOrganizationCreation: true,
        appName: 'My App',
        documentationUrl: '',
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

      const response = await app.inject()
        .put(`${apiPrefix.v1}/config`)
        .body(newConfig)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().message).toEqual(configMessages.updated)
      expect(response.json().data).toStrictEqual(newConfig)
    })

    it('should return 403 when user lacks config:update permission', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/config`)
        .body({ enableRegistration: false })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Forbidden')
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })

    it('should return 400 for invalid body', async () => {
      const response = await app.inject()
        .put(`${apiPrefix.v1}/config`)
        .body({ enableRegistration: 'not-a-boolean' })
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })
})
