import type { AuditEntry, AuditQueryOptions, AuditRepository, CreateAuditEntry } from './types.js'
import type { PrismaClient } from '~/generated/prisma/client.js'
import type { JsonValue } from '~/utils/prisma.js'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toAuditEntry(row: {
  id: string
  actorId: string
  action: string
  resourceType: string
  resourceId: string | null
  details: unknown
  createdAt: Date
}): AuditEntry {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    details: (row.details ?? null) as Record<string, unknown> | null,
    createdAt: row.createdAt,
  }
}

/**
 * Prisma-backed implementation of the Audit repository interface.
 */
export function createPrismaAuditRepository(db: PrismaClient): AuditRepository {
  return {
    async create(entry: CreateAuditEntry): Promise<AuditEntry> {
      const row = await db.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          details: (entry.details ?? undefined) as JsonValue | undefined,
        },
      })
      return toAuditEntry(row)
    },

    async query(options?: AuditQueryOptions): Promise<AuditEntry[]> {
      const where = buildWhere(options)
      const rows = await db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      })
      return rows.map(toAuditEntry)
    },

    async count(options?: Omit<AuditQueryOptions, 'limit' | 'offset'>): Promise<number> {
      const where = buildWhere(options)
      return db.auditLog.count({ where })
    },
  }
}

// ---------------------------------------------------------------------------
// Build Prisma where clause from query options
// ---------------------------------------------------------------------------

function buildWhere(options?: Partial<AuditQueryOptions>) {
  if (!options) return {}

  const where: Record<string, unknown> = {}

  if (options.actorId) where.actorId = options.actorId
  if (options.resourceType) where.resourceType = options.resourceType
  if (options.resourceId) where.resourceId = options.resourceId
  if (options.action) where.action = options.action

  if (options.after || options.before) {
    const createdAt: Record<string, Date> = {}
    if (options.after) createdAt.gte = new Date(options.after)
    if (options.before) createdAt.lte = new Date(options.before)
    where.createdAt = createdAt
  }

  return where
}
