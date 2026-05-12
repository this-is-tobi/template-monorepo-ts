import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { dbRo } from '~/prisma/__mocks__/clients.js'

vi.mock('~/database.js')

const mockOrgs = [
  { id: 'org-1', name: 'Org One', slug: 'org-one', logo: null, metadata: null, createdAt: new Date('2024-06-01'), _count: { members: 3 } },
  { id: 'org-2', name: 'Org Two', slug: 'org-two', logo: null, metadata: null, createdAt: new Date('2024-06-02'), _count: { members: 1 } },
]

const mockApiKeys = [
  { id: 'ak-1', configId: 'c-1', name: 'Key One', start: 'pk_', prefix: 'pk', referenceId: 'u-1', enabled: true, permissions: null, expiresAt: null, createdAt: new Date('2024-06-01'), updatedAt: new Date('2024-06-01') },
  { id: 'ak-2', configId: 'c-2', name: 'Key Two', start: 'sk_', prefix: 'sk', referenceId: 'u-2', enabled: false, permissions: '{"project":["read"]}', expiresAt: new Date('2025-01-01'), createdAt: new Date('2024-06-02'), updatedAt: new Date('2024-06-02') },
]

const mockUser = {
  id: 'u-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: true,
  image: null,
  role: 'admin',
  banned: false,
  banReason: null,
  banExpires: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  members: [
    { id: 'm-1', role: 'owner', createdAt: new Date('2024-01-01'), organization: { id: 'org-1', name: 'Org One', slug: 'org-one' } },
  ],
  ownedProjects: [
    { id: 'p-1', name: 'Project One', description: 'desc', createdAt: new Date('2024-01-01') },
  ],
}

describe('[Admin] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get /api/v1/admin/organizations', () => {
    it('should return organizations with member count', async () => {
      dbRo.organization.findMany.mockResolvedValueOnce(mockOrgs as never)
      dbRo.organization.count.mockResolvedValueOnce(2)

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
      dbRo.organization.findMany.mockResolvedValueOnce([] as never)
      dbRo.organization.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .query({ name: 'Org', slug: 'org-one' })
        .end()

      expect(dbRo.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Org', mode: 'insensitive' },
            slug: { contains: 'org-one', mode: 'insensitive' },
          }),
        }),
      )
    })

    it('should use default limit and offset', async () => {
      dbRo.organization.findMany.mockResolvedValueOnce([] as never)
      dbRo.organization.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .end()

      expect(dbRo.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      )
    })

    it('should include member count in query', async () => {
      dbRo.organization.findMany.mockResolvedValueOnce([] as never)
      dbRo.organization.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .end()

      expect(dbRo.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { _count: { select: { members: true } } },
        }),
      )
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('get /api/v1/admin/organizations/:id', () => {
    const mockOrgDetail = {
      id: 'org-1',
      name: 'Org One',
      slug: 'org-one',
      logo: null,
      metadata: null,
      createdAt: new Date('2024-06-01'),
      members: [
        { id: 'm-1', userId: 'u-1', role: 'owner', createdAt: new Date('2024-06-01'), user: { id: 'u-1', name: 'Alice', email: 'alice@example.com', image: null } },
        { id: 'm-2', userId: 'u-2', role: 'member', createdAt: new Date('2024-06-02'), user: { id: 'u-2', name: 'Bob', email: 'bob@example.com', image: null } },
      ],
      invitations: [
        { id: 'inv-1', email: 'charlie@example.com', role: 'member', status: 'pending', expiresAt: new Date('2025-01-01') },
      ],
    }

    it('should return an organization with members and invitations', async () => {
      dbRo.organization.findUnique.mockResolvedValueOnce(mockOrgDetail as never)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations/a0000000-0000-4000-8000-000000000001`)
        .end()

      expect(response.statusCode).toEqual(200)
      const body = response.json()
      expect(body.data.name).toEqual('Org One')
      expect(body.data.members).toHaveLength(2)
      expect(body.data.members[0].user.name).toEqual('Alice')
      expect(body.data.invitations).toHaveLength(1)
      expect(body.data.invitations[0].email).toEqual('charlie@example.com')
    })

    it('should return 404 when organization is not found', async () => {
      dbRo.organization.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations/a0000000-0000-4000-8000-000000000002`)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/organizations/a0000000-0000-4000-8000-000000000001`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('get /api/v1/admin/api-keys', () => {
    it('should return API keys without key hash', async () => {
      dbRo.apiKey.findMany.mockResolvedValueOnce(mockApiKeys as never)
      dbRo.apiKey.count.mockResolvedValueOnce(2)

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
      dbRo.apiKey.findMany.mockResolvedValueOnce([] as never)
      dbRo.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .end()

      expect(dbRo.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          omit: { key: true },
        }),
      )
    })

    it('should filter by name and referenceId', async () => {
      dbRo.apiKey.findMany.mockResolvedValueOnce([] as never)
      dbRo.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .query({ name: 'Key', referenceId: 'u-1' })
        .end()

      expect(dbRo.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Key', mode: 'insensitive' },
            referenceId: 'u-1',
          }),
        }),
      )
    })

    it('should filter by enabled status', async () => {
      dbRo.apiKey.findMany.mockResolvedValueOnce([] as never)
      dbRo.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .query({ enabled: 'true' })
        .end()

      expect(dbRo.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ enabled: true }),
        }),
      )
    })

    it('should use default limit and offset', async () => {
      dbRo.apiKey.findMany.mockResolvedValueOnce([] as never)
      dbRo.apiKey.count.mockResolvedValueOnce(0)

      await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .end()

      expect(dbRo.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      )
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('get /api/v1/admin/api-keys/:id', () => {
    it('should return a single API key by ID', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockApiKeys[0] as never)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys/a0000000-0000-4000-8000-000000000001`)
        .end()

      expect(response.statusCode).toEqual(200)
      const body = response.json()
      expect(body.data.name).toEqual('Key One')
      expect(body.data).not.toHaveProperty('key')
    })

    it('should return 404 when API key is not found', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys/a0000000-0000-4000-8000-000000000002`)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/api-keys/a0000000-0000-4000-8000-000000000001`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('get /api/v1/admin/users/:id', () => {
    it('should return a user with related resources', async () => {
      dbRo.user.findUnique.mockResolvedValueOnce(mockUser as never)
      dbRo.apiKey.findMany.mockResolvedValueOnce([mockApiKeys[0]] as never)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/users/a0000000-0000-4000-8000-000000000001`)
        .end()

      expect(response.statusCode).toEqual(200)
      const body = response.json()
      expect(body.data.name).toEqual('Test User')
      expect(body.data.memberships).toHaveLength(1)
      expect(body.data.memberships[0].organization.name).toEqual('Org One')
      expect(body.data.projects).toHaveLength(1)
      expect(body.data.projects[0].name).toEqual('Project One')
      expect(body.data.apiKeys).toHaveLength(1)
    })

    it('should return 404 when user is not found', async () => {
      dbRo.user.findUnique.mockResolvedValueOnce(null)
      dbRo.apiKey.findMany.mockResolvedValueOnce([] as never)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/users/a0000000-0000-4000-8000-000000000002`)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/admin/users/a0000000-0000-4000-8000-000000000001`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})
