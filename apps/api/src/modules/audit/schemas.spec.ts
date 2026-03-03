import { randomUUID } from 'node:crypto'
import { AuditEntrySchema, AuditQuerySchema, CreateAuditEntrySchema } from './schemas.js'

describe('audit schemas', () => {
  describe('auditEntrySchema', () => {
    it('should parse a valid audit entry', () => {
      const data = {
        id: randomUUID(),
        actorId: 'user-1',
        action: 'create',
        resourceType: 'project',
        resourceId: 'proj-1',
        details: { name: 'My Project' },
        createdAt: new Date().toISOString(),
      }
      expect(() => AuditEntrySchema.parse(data)).not.toThrow()
    })

    it('should parse without optional fields', () => {
      const data = {
        id: randomUUID(),
        actorId: 'user-1',
        action: 'delete',
        resourceType: 'user',
      }
      expect(() => AuditEntrySchema.parse(data)).not.toThrow()
    })

    it('should reject missing required fields', () => {
      expect(() => AuditEntrySchema.parse({ id: randomUUID() })).toThrow()
    })
  })

  describe('createAuditEntrySchema', () => {
    it('should parse a valid create payload', () => {
      const data = {
        actorId: 'user-1',
        action: 'create',
        resourceType: 'project',
      }
      expect(() => CreateAuditEntrySchema.parse(data)).not.toThrow()
    })

    it('should parse with all optional fields', () => {
      const data = {
        actorId: 'user-1',
        action: 'update',
        resourceType: 'project',
        resourceId: 'proj-1',
        details: { field: 'value' },
      }
      expect(() => CreateAuditEntrySchema.parse(data)).not.toThrow()
    })

    it('should reject empty actorId', () => {
      expect(() =>
        CreateAuditEntrySchema.parse({ actorId: '', action: 'create', resourceType: 'project' }),
      ).toThrow()
    })
  })

  describe('auditQuerySchema', () => {
    it('should parse with defaults', () => {
      const result = AuditQuerySchema.parse({})
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    it('should parse with all optional filters', () => {
      const data = {
        actorId: 'user-1',
        resourceType: 'project',
        resourceId: 'proj-1',
        action: 'create',
        after: new Date().toISOString(),
        before: new Date().toISOString(),
        limit: 10,
        offset: 20,
      }
      expect(() => AuditQuerySchema.parse(data)).not.toThrow()
    })

    it('should reject limit above 1000', () => {
      expect(() => AuditQuerySchema.parse({ limit: 1001 })).toThrow()
    })
  })
})
