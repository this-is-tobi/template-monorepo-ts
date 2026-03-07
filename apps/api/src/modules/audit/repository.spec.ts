import { db } from '~/prisma/__mocks__/clients.js'
import { createPrismaAuditRepository } from './repository.js'

vi.mock('~/database.js')

const now = new Date()
const baseRow = {
  id: 'entry-1',
  actorId: 'user-1',
  action: 'create',
  resourceType: 'project',
  resourceId: 'proj-1',
  details: null,
  createdAt: now,
}

describe('audit repository', () => {
  const repo = createPrismaAuditRepository(db as never)

  describe('create', () => {
    it('should create and return an audit entry', async () => {
      db.auditLog.create.mockResolvedValueOnce(baseRow)

      const result = await repo.create({
        actorId: 'user-1',
        action: 'create',
        resourceType: 'project',
        resourceId: 'proj-1',
      })

      expect(db.auditLog.create).toHaveBeenCalledTimes(1)
      expect(result.id).toBe('entry-1')
      expect(result.actorId).toBe('user-1')
    })

    it('should create without optional fields', async () => {
      db.auditLog.create.mockResolvedValueOnce({ ...baseRow, resourceId: null })

      const result = await repo.create({ actorId: 'user-1', action: 'login', resourceType: 'session' })

      expect(result.resourceId).toBeNull()
    })
  })

  describe('query', () => {
    it('should return all entries with no filter', async () => {
      db.auditLog.findMany.mockResolvedValueOnce([baseRow])

      const result = await repo.query()

      expect(db.auditLog.findMany).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(1)
    })

    it('should apply actorId, resourceType, action, resourceId filters', async () => {
      db.auditLog.findMany.mockResolvedValueOnce([])

      await repo.query({ actorId: 'u1', resourceType: 'project', resourceId: 'p1', action: 'create' })

      const call = db.auditLog.findMany.mock.calls[0]![0]!
      expect(call.where).toMatchObject({ actorId: 'u1', resourceType: 'project', resourceId: 'p1', action: 'create' })
    })

    it('should apply date range filters', async () => {
      db.auditLog.findMany.mockResolvedValueOnce([])

      const after = '2024-01-01T00:00:00.000Z'
      const before = '2024-12-31T23:59:59.000Z'
      await repo.query({ after, before })

      const call = db.auditLog.findMany.mock.calls[0]![0]!
      expect((call.where as Record<string, unknown>).createdAt).toMatchObject({ gte: new Date(after), lte: new Date(before) })
    })

    it('should apply only after filter (no before)', async () => {
      db.auditLog.findMany.mockResolvedValueOnce([])

      const after = '2024-01-01T00:00:00.000Z'
      await repo.query({ after })

      const call = db.auditLog.findMany.mock.calls[0]![0]!
      const createdAt = (call.where as Record<string, unknown>).createdAt as Record<string, unknown>
      expect(createdAt.gte).toEqual(new Date(after))
      expect(createdAt.lte).toBeUndefined()
    })

    it('should apply only before filter (no after)', async () => {
      db.auditLog.findMany.mockResolvedValueOnce([])

      const before = '2024-12-31T23:59:59.000Z'
      await repo.query({ before })

      const call = db.auditLog.findMany.mock.calls[0]![0]!
      const createdAt = (call.where as Record<string, unknown>).createdAt as Record<string, unknown>
      expect(createdAt.lte).toEqual(new Date(before))
      expect(createdAt.gte).toBeUndefined()
    })

    it('should apply limit and offset', async () => {
      db.auditLog.findMany.mockResolvedValueOnce([])

      await repo.query({ limit: 10, offset: 5 })

      const call = db.auditLog.findMany.mock.calls[0]![0]!
      expect(call.take).toBe(10)
      expect(call.skip).toBe(5)
    })
  })

  describe('count', () => {
    it('should return total count with no filter', async () => {
      db.auditLog.count.mockResolvedValueOnce(42)

      const result = await repo.count()

      expect(result).toBe(42)
    })

    it('should apply filters when counting', async () => {
      db.auditLog.count.mockResolvedValueOnce(3)

      await repo.count({ actorId: 'user-1' })

      const call = db.auditLog.count.mock.calls[0]![0]!
      expect((call.where as Record<string, unknown>).actorId).toBe('user-1')
    })
  })
})
