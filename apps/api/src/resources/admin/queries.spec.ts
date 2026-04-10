import { randomUUID } from 'node:crypto'
import { db } from '~/prisma/__mocks__/clients.js'
import {
  countAdminApiKeys,
  countAdminOrganizations,
  getAdminApiKeyByIdQuery,
  getAdminApiKeysQuery,
  getAdminOrganizationByIdQuery,
  getAdminOrganizationsQuery,
  getAdminUserApiKeysQuery,
  getAdminUserByIdQuery,
} from './queries.js'

vi.mock('~/database.js')

describe('[Admin] - Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Organizations
  // ---------------------------------------------------------------------------

  describe('getAdminOrganizationsQuery', () => {
    it('should query with no filters', async () => {
      db.organization.findMany.mockResolvedValueOnce([])

      await getAdminOrganizationsQuery({ limit: 20, offset: 0 })

      expect(db.organization.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: { _count: { select: { members: true } } },
      })
    })

    it('should filter by id, name, and slug', async () => {
      db.organization.findMany.mockResolvedValueOnce([])

      await getAdminOrganizationsQuery({ id: 'org', name: 'test', slug: 'slu', limit: 10, offset: 0 })

      expect(db.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: { contains: 'org', mode: 'insensitive' },
          name: { contains: 'test', mode: 'insensitive' },
          slug: { contains: 'slu', mode: 'insensitive' },
        },
      }))
    })

    it('should filter by after and before dates', async () => {
      db.organization.findMany.mockResolvedValueOnce([])

      await getAdminOrganizationsQuery({ after: '2026-01-01', before: '2026-12-31', limit: 10, offset: 0 })

      expect(db.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        },
      }))
    })

    it('should filter by after only', async () => {
      db.organization.findMany.mockResolvedValueOnce([])

      await getAdminOrganizationsQuery({ after: '2026-01-01', limit: 10, offset: 0 })

      expect(db.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          createdAt: { gte: new Date('2026-01-01') },
        },
      }))
    })

    it('should filter by before only', async () => {
      db.organization.findMany.mockResolvedValueOnce([])

      await getAdminOrganizationsQuery({ before: '2026-12-31', limit: 10, offset: 0 })

      expect(db.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          createdAt: { lte: new Date('2026-12-31') },
        },
      }))
    })
  })

  describe('countAdminOrganizations', () => {
    it('should count with the same where clause', async () => {
      db.organization.count.mockResolvedValueOnce(5)

      const count = await countAdminOrganizations({ name: 'test', limit: 10, offset: 0 })

      expect(db.organization.count).toHaveBeenCalledWith({
        where: { name: { contains: 'test', mode: 'insensitive' } },
      })
      expect(count).toBe(5)
    })
  })

  describe('getAdminOrganizationByIdQuery', () => {
    it('should fetch organization with members and invitations', async () => {
      const orgId = randomUUID()
      db.organization.findUnique.mockResolvedValueOnce({ id: orgId } as never)

      await getAdminOrganizationByIdQuery(orgId)

      expect(db.organization.findUnique).toHaveBeenCalledWith({
        where: { id: orgId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          invitations: {
            select: { id: true, email: true, role: true, status: true, expiresAt: true },
            orderBy: { expiresAt: 'desc' },
          },
        },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // API Keys
  // ---------------------------------------------------------------------------

  describe('getAdminApiKeysQuery', () => {
    it('should query with no filters', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([])

      await getAdminApiKeysQuery({ limit: 20, offset: 0 })

      expect(db.apiKey.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        omit: { key: true },
      })
    })

    it('should filter by id, name, referenceId, and enabled', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([])

      await getAdminApiKeysQuery({ id: 'ak', name: 'key', referenceId: 'u-1', enabled: 'true', limit: 10, offset: 0 })

      expect(db.apiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: { contains: 'ak', mode: 'insensitive' },
          name: { contains: 'key', mode: 'insensitive' },
          referenceId: 'u-1',
          enabled: true,
        },
      }))
    })

    it('should filter by after and before dates', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([])

      await getAdminApiKeysQuery({ after: '2026-01-01', before: '2026-12-31', limit: 10, offset: 0 })

      expect(db.apiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        },
      }))
    })

    it('should filter by after only', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([])

      await getAdminApiKeysQuery({ after: '2026-06-15', limit: 10, offset: 0 })

      expect(db.apiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          createdAt: { gte: new Date('2026-06-15') },
        },
      }))
    })

    it('should convert enabled=false correctly', async () => {
      db.apiKey.findMany.mockResolvedValueOnce([])

      await getAdminApiKeysQuery({ enabled: 'false', limit: 10, offset: 0 })

      expect(db.apiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { enabled: false },
      }))
    })
  })

  describe('countAdminApiKeys', () => {
    it('should count with the same where clause', async () => {
      db.apiKey.count.mockResolvedValueOnce(3)

      const count = await countAdminApiKeys({ name: 'key', limit: 10, offset: 0 })

      expect(db.apiKey.count).toHaveBeenCalledWith({
        where: { name: { contains: 'key', mode: 'insensitive' } },
      })
      expect(count).toBe(3)
    })
  })

  describe('getAdminApiKeyByIdQuery', () => {
    it('should fetch a single API key by ID without key hash', async () => {
      const id = randomUUID()
      db.apiKey.findUnique.mockResolvedValueOnce({ id } as never)

      await getAdminApiKeyByIdQuery(id)

      expect(db.apiKey.findUnique).toHaveBeenCalledWith({
        where: { id },
        omit: { key: true },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  describe('getAdminUserByIdQuery', () => {
    it('should fetch user with members and owned projects', async () => {
      const userId = randomUUID()
      db.user.findUnique.mockResolvedValueOnce({ id: userId } as never)

      await getAdminUserByIdQuery(userId)

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        omit: { twoFactorEnabled: true },
        include: {
          members: {
            include: {
              organization: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          ownedProjects: {
            select: { id: true, name: true, description: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      })
    })
  })

  describe('getAdminUserApiKeysQuery', () => {
    it('should fetch API keys by referenceId', async () => {
      const userId = randomUUID()
      db.apiKey.findMany.mockResolvedValueOnce([])

      await getAdminUserApiKeysQuery(userId)

      expect(db.apiKey.findMany).toHaveBeenCalledWith({
        where: { referenceId: userId },
        omit: { key: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
