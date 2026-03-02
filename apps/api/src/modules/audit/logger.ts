import type { AuditEntry, AuditQueryOptions, AuditRepository, CreateAuditEntry } from './types.js'

// ---------------------------------------------------------------------------
// Audit logger — thin wrapper around a repository with convenience methods
// ---------------------------------------------------------------------------

/**
 * Options for creating an audit logger.
 */
export interface AuditLoggerOptions {
  /** Storage backend. */
  repository: AuditRepository
}

/**
 * Audit logger instance.
 */
export interface AuditLogger {
  /**
   * Log an action.
   *
   * @example
   * ```ts
   * await audit.log({
   *   actorId: userId,
   *   action: 'create',
   *   resourceType: 'project',
   *   resourceId: projectId,
   *   details: { name: 'My Project' },
   * })
   * ```
   */
  log: (entry: CreateAuditEntry) => Promise<AuditEntry>

  /**
   * Log an action without awaiting (fire-and-forget).
   * Errors are silently caught and logged to stderr.
   */
  logAsync: (entry: CreateAuditEntry) => void
}

/**
 * Create an audit logger backed by a repository.
 *
 * @example
 * ```ts
 * const audit = createAuditLogger({
 *   repository: prismaAuditRepository(db),
 * })
 * ```
 */
export function createAuditLogger(opts: AuditLoggerOptions): AuditLogger {
  const repo = opts.repository

  async function log(entry: CreateAuditEntry): Promise<AuditEntry> {
    return repo.create(entry)
  }

  function logAsync(entry: CreateAuditEntry): void {
    repo.create(entry).catch((err) => {
      console.error('[audit] failed to write audit entry:', err)
    })
  }

  return { log, logAsync }
}

// ---------------------------------------------------------------------------
// In-memory repository — useful for testing and development
// ---------------------------------------------------------------------------

/** Shared filter logic for the in-memory store — applied by both `query` and `count`. */
function applyFilters(entries: AuditEntry[], options?: Partial<AuditQueryOptions>): AuditEntry[] {
  let result = [...entries]
  if (options?.actorId) result = result.filter(e => e.actorId === options.actorId)
  if (options?.resourceType) result = result.filter(e => e.resourceType === options.resourceType)
  if (options?.resourceId) result = result.filter(e => e.resourceId === options.resourceId)
  if (options?.action) result = result.filter(e => e.action === options.action)
  if (options?.after) {
    const after = new Date(options.after).getTime()
    result = result.filter(e => new Date(e.createdAt!).getTime() > after)
  }
  if (options?.before) {
    const before = new Date(options.before).getTime()
    result = result.filter(e => new Date(e.createdAt!).getTime() < before)
  }
  return result
}

/**
 * In-memory audit repository.  Stores entries in a plain array.
 * Useful for tests and local development.
 */
export function createInMemoryAuditRepository(): AuditRepository & { entries: AuditEntry[] } {
  const entries: AuditEntry[] = []
  let counter = 0

  return {
    entries,

    create: async (entry) => {
      counter++
      const record: AuditEntry = {
        ...entry,
        id: `audit-${counter}`,
        createdAt: new Date().toISOString(),
      }
      entries.push(record)
      return record
    },

    query: async (options) => {
      const filtered = applyFilters(entries, options)
      const offset = options?.offset ?? 0
      const limit = options?.limit ?? 50
      return filtered.slice(offset, offset + limit)
    },

    count: async (options) => {
      return applyFilters(entries, options).length
    },
  }
}
