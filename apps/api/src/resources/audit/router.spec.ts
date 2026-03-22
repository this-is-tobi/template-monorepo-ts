import type { AuditEntry, AuditRepository } from '~/modules/audit/types.js'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { auditMessages } from './constants.js'

vi.mock('~/database.js')

const mockEntries: AuditEntry[] = [
  {
    id: 'audit-1',
    actorId: 'user-1',
    action: 'project:create',
    resourceType: 'project',
    resourceId: 'proj-1',
    details: { granted: true, grantedBy: 'platform_admin' },
    createdAt: '2024-06-01T00:00:00.000Z',
  },
  {
    id: 'audit-2',
    actorId: 'user-2',
    action: 'project:read',
    resourceType: 'project',
    resourceId: 'proj-2',
    details: { granted: false },
    createdAt: '2024-06-02T00:00:00.000Z',
  },
]

const mockRepository: AuditRepository = {
  create: vi.fn(),
  query: vi.fn<() => Promise<AuditEntry[]>>().mockResolvedValue(mockEntries),
  count: vi.fn<() => Promise<number>>().mockResolvedValue(mockEntries.length),
}

describe('[Audit] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    app.auditRepository = mockRepository
    vi.mocked(mockRepository.query).mockResolvedValue(mockEntries)
    vi.mocked(mockRepository.count).mockResolvedValue(mockEntries.length)
  })

  describe('gET /api/v1/audit', () => {
    it('should return paginated audit logs for admin', async () => {
      const response = await app.inject()
        .get(`${apiPrefix.v1}/audit`)
        .end()

      expect(response.statusCode).toEqual(200)
      const body = response.json()
      expect(body.data).toHaveLength(2)
      expect(body.total).toEqual(2)
      expect(body.data[0].id).toEqual('audit-1')
    })

    it('should pass query filters to the repository', async () => {
      vi.mocked(mockRepository.query).mockResolvedValueOnce([mockEntries[0]])
      vi.mocked(mockRepository.count).mockResolvedValueOnce(1)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/audit`)
        .query({ actorId: 'user-1', resourceType: 'project', limit: '10', offset: '0' })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'user-1', resourceType: 'project', limit: 10, offset: 0 }),
      )
      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'user-1', resourceType: 'project', limit: 10, offset: 0 }),
      )
      expect(response.json().data).toHaveLength(1)
      expect(response.json().total).toEqual(1)
    })

    it('should return 403 when user lacks audit:read permission', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/audit`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Forbidden')
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })

    it('should return 501 when audit module is not enabled', async () => {
      app.auditRepository = undefined

      const response = await app.inject()
        .get(`${apiPrefix.v1}/audit`)
        .end()

      expect(response.statusCode).toEqual(501)
      expect(response.json().message).toEqual(auditMessages.unavailable)
    })

    it('should use default limit and offset', async () => {
      const response = await app.inject()
        .get(`${apiPrefix.v1}/audit`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0 }),
      )
    })
  })
})
