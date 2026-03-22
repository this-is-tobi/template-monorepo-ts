import type { FastifyInstance } from 'fastify'
import type { AuditQueryOptions } from '~/modules/audit/types.js'
import { auditRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { auditMessages } from './constants.js'

export function getAuditRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/audit — requires audit:read permission (admin only)
    app.get(
      auditRoutes.getAuditLogs.path,
      { ...createRouteOptions(auditRoutes.getAuditLogs), preHandler: [app.requireAuth, createZodValidationHandler(auditRoutes.getAuditLogs), app.requirePermission({ audit: ['read'] })] },
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
