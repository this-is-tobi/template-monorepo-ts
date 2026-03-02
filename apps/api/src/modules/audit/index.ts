import type { AppModule } from '../types.js'
import type { AuditLogger } from './logger.js'
import { db } from '~/prisma/clients.js'
import { createAuditLogger } from './logger.js'
import { createPrismaAuditRepository } from './repository.js'

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

    app.log.info('Audit module — structured audit logging ready')
  },
}

export default auditModule
