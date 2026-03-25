import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { db } from '~/prisma/__mocks__/clients.js'

vi.mock('~/database.js')

const mockOrgs = [
  { id: 'org-1', name: 'Org One', slug: 'org-one', logo: null, metadata: null, createdAt: new Date('2024-06-01'), _count: { members: 3 } },
  { id: 'org-2', name: 'Org Two', slug: 'org-two', logo: null, metadata: null, createdAt: new Date('2024-06-02'), _count: { members: 1 } },
]

const mockApiKeys = [
  { id: 'ak-1', configId: 'c-1', name: 'Key One', start: 'pk_', prefix: 'pk', referenceId: 'u-1', enabled: true, permissions: null, expiresAt: null, createdAt: new Date('2024-06-01'), updatedAt: new Date('2024-06-01') },
  { id: 'ak-2', configId: 'c-2', name: 'Key Two', start: 'sk_', prefix: 'sk', referenceId: 'u-2', enabled: false, permissions: '{"project":["read"]}', expiresAt: new Date('2025-01-01'), createdAt: new Date('2024-06-02'), updatedAt: new Date('2024-06-02') },
]

describe('[Admin] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get /api/v1/admin/organizations', () => {
    it('should return organizations with member count', async () => {
      db.organization.findMany.mockResolvedValueOnce(mockOrgs as never)
      db.organization.count.mockResolvedValueOnce(2)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .end()

      expect(response.statusCode).toEqual(200)
      const body = response.json()
      expect(body.data).toHaveLength(2)
      expect(body.total).toEqual(2)
      expect(body.data[0].memberCount).toEqual(3)
      expect(body.data[1].memberCount).toEqual(1)
      expect(body.data[0]._count).toBeUndefined()
    })

    it('should pass name and slug filters', async () => {
      db.organization.findMany.mockResolvedValueOnce([] as never)
      db.organization.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .query({ name: 'Org', slug: 'org-one' })
        .end()

      expect(db.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Org', mode: 'insensitive' },
            slug: { contains: 'org-one', mode: 'insensitive' },
          }),
        }),
      )
    })

    it('should use default limit and offset', async () => {
      db.organization.findMany.mockResolvedValueOnce([] as never)
      db.organization.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .end()

      expect(db.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      )
    })

    it('should include member count in query', async () => {
      db.organization.findMany.mockResolvedValueOnce([] as never)
      db.organization.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .end()

      expect(db.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { _count: { select: { members: true } } },
        }),
      )
    })
  })

  describe('get /api/v1/admin/api-keys', () => {
    it('should return API keys without key hash', async () => {
      db.apiKey.findMany.mockResolvedValueOnce(mockApiKeys as never)
      db.apiKey.count.mockResolvedValueOnce(2)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .end()

      expect(response.statusCode).toEqual(200)
      const body = response.json()
      expect(body.data).toHaveLength(2)
      expect(body.total).toEqual(2)
      expect(body.data[0]).not.toHaveProperty('key')
    })

    it('should omit key field in Prisma query', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([] as never)
      db.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .end()

      expect(db.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          omit: { key: true },
        }),
      )
    })

    it('should filter by name and referenceId', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([] as never)
      db.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .query({ name: 'Key', referenceId: 'u-1' })
        .end()

      expect(db.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Key', mode: 'insensitive' },
            referenceId: 'u-1',
          }),
        }),
      )
    })

    it('should filter by enabled status', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([] as never)
      db.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .query({ enabled: 'true' })
        .end()

      expect(db.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ enabled: true }),
        }),
      )
    })

    it('should use default limit and offset', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([] as never)
      db.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .end()

      expect(db.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      )
    })
  })
})
