import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { MOCK_ADMIN_ID, mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'

vi.mock('~/database.js')

describe('[ApiKeys] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const keyId = randomUUID()
  const mockKey = {
    id: keyId,
    configId: 'default',
    name: 'Test Key',
    start: 'tm_',
    prefix: 'tm',
    referenceId: MOCK_ADMIN_ID,
    enabled: true,
    permissions: null,
    metadata: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('updateApiKey', () => {
    it('should update API key name', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, name: 'Renamed' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ name: 'Renamed' })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data.name).toEqual('Renamed')
    })

    it('should update permissions', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      const perms = { project: ['read', 'create'] }
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, permissions: JSON.stringify(perms) } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: perms })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ permissions: JSON.stringify(perms) }),
      }))
    })

    it('should update scope metadata', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      // User is a member of org-1
      db.member.count.mockResolvedValueOnce(1 as never)
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, metadata: '{"organizationIds":["org-1"]}' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ organizationIds: ['org-1'], projectIds: [] })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ metadata: JSON.stringify({ organizationIds: ['org-1'] }) }),
      }))
    })

    it('should return 403 when scoping to an inaccessible organization', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      // User is NOT a member of the requested org
      db.member.count.mockResolvedValueOnce(0 as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ organizationIds: ['org-not-mine'] })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INVALID_SCOPE')
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should return 403 when scoping to an inaccessible project', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      // User is NOT a member of the requested project
      db.projectMember.count.mockResolvedValueOnce(0 as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ projectIds: ['proj-not-mine'] })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INVALID_SCOPE')
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should clear metadata when scope arrays are empty', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, metadata: null } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ organizationIds: [], projectIds: [] })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ metadata: null }),
      }))
    })

    it('should return 404 when key does not exist', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${randomUUID()}`)
        .body({ name: 'X' })
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user does not own the key', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })
      dbRo.apiKey.findUnique.mockResolvedValueOnce({ ...mockKey, referenceId: 'other-user' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ name: 'X' })
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should return 400 for invalid body', async () => {
      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ name: '' })
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })
})
