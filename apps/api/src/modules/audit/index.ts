import type { AppModule } from '../types.js'
import type { AuditLogger } from './logger.js'
import { db } from '~/prisma/clients.js'
import { config } from '~/utils/config.js'
import { setAuthAuditLogger } from '../auth/auth.js'
import { createAuditLogger } from './logger.js'
import { createPrismaAuditRepository } from './repository.js'

/** Interval handle for periodic retention pruning (24 h). */
let retentionTimer: ReturnType<typeof setInterval> | undefined

/**
 * Audit module — structured audit logging.
 *
 * When enabled (`config.modules.audit`):
 * - Creates a Prisma-backed audit repository
 * - Decorates Fastify with `auditLogger` for fire-and-forget audit logging
 *
 * Route handlers use `app.auditLogger.log(…)` or `app.auditLogger.logAsync(…)`
 * to record user actions.  The module is purely infrastructure — it does not
 * register any routes itself.
 */
const auditModule: AppModule = {
  name: 'audit',

  register: async (app) => {
    const repository = createPrismaAuditRepository(db)
    const logger: AuditLogger = createAuditLogger({ repository })

    app.decorate('auditLogger', logger)
    app.decorate('auditRepository', repository)

    // Bridge: let auth-level audit entries flow through AuditLogger
    setAuthAuditLogger(logger)

    app.log.info('Audit module — structured audit logging ready')
  },

  onReady: async ({ logger }) => {
    const days = config.modules.audit.retentionDays
    if (days <= 0) return

    const repository = createPrismaAuditRepository(db)

    /** Delete entries older than the configured retention window. */
    async function prune() {
      const cutoff = new Date(Date.now() - days * 86_400_000)
      const deleted = await repository.prune(cutoff)
      if (deleted > 0) {
        logger.info({ deleted, retentionDays: days }, 'audit log retention — pruned old entries')
      }
    }

    // Run once at startup, then every 24 hours
    await prune()
    retentionTimer = setInterval(prune, 86_400_000)
  },

  onClose: async () => {
    if (retentionTimer) {
      clearInterval(retentionTimer)
      retentionTimer = undefined
    }
  },
}

export default auditModule
