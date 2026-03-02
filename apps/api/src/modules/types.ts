import type { FastifyBaseLogger, FastifyInstance } from 'fastify'

import type { AuditLogger } from '~/modules/audit/logger.js'

// ---------------------------------------------------------------------------
// AppModule — the contract every feature module must fulfil
// ---------------------------------------------------------------------------

/**
 * Context passed to lifecycle hooks (`onReady`, `onClose`).
 */
export interface ModuleContext {
  logger: FastifyBaseLogger
}

/**
 * A self-contained feature module.
 *
 * - `register`  — called during Fastify's plugin phase (decorate, add routes).
 * - `onReady`   — called **after** the database is connected (bootstrap data, warm caches).
 * - `onClose`   — called during graceful shutdown (release resources).
 */
export interface AppModule {
  /** Unique module identifier (lowercase, e.g. `"auth"`). */
  readonly name: string

  /** Register Fastify decorators, hooks & routes. */
  register: (app: FastifyInstance) => Promise<void>

  /** Post-DB-init lifecycle hook (optional). */
  onReady?: (ctx: ModuleContext) => Promise<void>

  /** Graceful-shutdown lifecycle hook (optional). */
  onClose?: (ctx: ModuleContext) => Promise<void>
}

// ---------------------------------------------------------------------------
// Fastify type augmentations — always available regardless of module state
// ---------------------------------------------------------------------------

declare module 'fastify' {
  interface FastifyInstance {
    // ── Auth (always available — no-ops when auth module is disabled) ────
    /** Require a valid session (cookie or Bearer token). */
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    /** Require one of the listed roles — also calls `requireAuth` internally. */
    requireRole: (...roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>

    // ── Audit (available when `modules.audit` is enabled) ───────────────
    /** Structured audit logger — use `log()` or `logAsync()`. */
    auditLogger?: AuditLogger
  }
}
