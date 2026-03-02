// ---------------------------------------------------------------------------
// Audit — core types
// ---------------------------------------------------------------------------

/**
 * An audit log entry recording a user action.
 */
export interface AuditEntry {
  id: string
  /** The user who performed the action. */
  actorId: string
  /** The action performed (e.g. `'create'`, `'delete'`). */
  action: string
  /** The type of resource affected (e.g. `'organization'`, `'project'`). */
  resourceType: string
  /** The ID of the affected resource (optional for bulk actions). */
  resourceId?: string | null
  /** Additional structured data about the action. */
  details?: Record<string, unknown> | null
  /** When the action occurred. */
  createdAt?: Date | string
}

/**
 * Input for creating a new audit entry (omits auto-generated fields).
 */
export type CreateAuditEntry = Omit<AuditEntry, 'id' | 'createdAt'>

/**
 * Filter options for querying audit logs.
 */
export interface AuditQueryOptions {
  actorId?: string
  resourceType?: string
  resourceId?: string
  action?: string
  /** Only entries after this date. */
  after?: Date | string
  /** Only entries before this date. */
  before?: Date | string
  /** Maximum number of entries to return. */
  limit?: number
  /** Offset for pagination. */
  offset?: number
}

// ---------------------------------------------------------------------------
// Repository interface — pluggable storage backend
// ---------------------------------------------------------------------------

/**
 * Storage backend for audit entries.
 *
 * Implement this interface to plug in any storage backend (Prisma, console,
 * external SIEM, etc.).  The module ships a Prisma implementation;
 * an in-memory implementation is available for tests (see `logger.ts`).
 */
export interface AuditRepository {
  /** Write a new audit entry. */
  create: (entry: CreateAuditEntry) => Promise<AuditEntry>
  /** Query audit entries with optional filters. */
  query: (options?: AuditQueryOptions) => Promise<AuditEntry[]>
  /** Count matching audit entries (for pagination). */
  count: (options?: Omit<AuditQueryOptions, 'limit' | 'offset'>) => Promise<number>
}
