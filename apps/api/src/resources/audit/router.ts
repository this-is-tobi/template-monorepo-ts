import type { FastifyInstance } from 'fastify'
import type { AuditQueryOptions } from '~/modules/audit/types.js'
import { auditRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { auditMessages } from './constants.js'

/** Creates the audit router plugin for Fastify. */
export function getAuditRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/audit — platform admin only (audit logs are system-wide)
    app.get(
      auditRoutes.getAuditLogs.path,
      { ...createRouteOptions(auditRoutes.getAuditLogs), preHandler: [app.requireAuth, createZodValidationHandler(auditRoutes.getAuditLogs), app.requireRole('admin')] },
      async (request, reply) => {
        const repository = app.auditRepository
        if (!repository) {
          reply.code(501).send({ message: auditMessages.unavailable })
          return
        }

        const query = request.query as AuditQueryOptions
        const [data, total] = await Promise.all([
          repository.query(query),
          repository.count(query),
        ])

        reply.code(200).send({ data, total })
      },
    )
  }
}
