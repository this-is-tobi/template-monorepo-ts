import type { AppModule } from '../types.js'
import type { AuditLogger } from './logger.js'
import { db } from '~/prisma/clients.js'
import { getConfigQuery } from '~/resources/config/queries.js'
import { setAuthAuditLogger } from '../auth/auth.js'
import { createAuditLogger } from './logger.js'
import { createPrismaAuditRepository } from './repository.js'

const MS_PER_DAY = 86_400_000

/**
 * How often the retention sweep runs. Deliberately a separate constant from
 * {@link MS_PER_DAY}: they happen to be equal, but one is a schedule and the
 * other converts the configured retention window, and changing the cadence
 * must not silently rescale how long entries are kept.
 */
const PRUNE_INTERVAL_MS = MS_PER_DAY

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
    const repository = createPrismaAuditRepository(db)

    /**
     * Delete entries older than the configured retention window.
     *
     * The window is runtime policy (`AppConfig.auditRetentionDays`), so it is
     * re-read on every sweep rather than captured at boot — changing it from
     * the admin UI takes effect on the next run, with no restart. `0` keeps
     * entries forever.
     */
    async function prune() {
      const days = (await getConfigQuery()).auditRetentionDays
      if (days <= 0) return

      const cutoff = new Date(Date.now() - days * MS_PER_DAY)
      const deleted = await repository.prune(cutoff)
      if (deleted > 0) {
        logger.info({ deleted, retentionDays: days }, 'audit log retention — pruned old entries')
      }
    }

    /** A failed sweep must never take the timer (or the process) down. */
    async function safePrune() {
      try {
        await prune()
      } catch (error) {
        logger.error({ error }, 'audit log retention — prune failed')
      }
    }

    // Run once at startup, then every 24 hours. The timer starts even when
    // retention is currently off, so enabling it later needs no restart.
    await safePrune()
    retentionTimer = setInterval(safePrune, PRUNE_INTERVAL_MS)
  },

  onClose: async () => {
    if (retentionTimer) {
      clearInterval(retentionTimer)
      retentionTimer = undefined
    }
  },
}

export default auditModule
