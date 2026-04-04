import type { FastifyInstance } from 'fastify'
import type { AuditQueryOptions } from '~/modules/audit/types.js'
import { auditRoutes } from '@template-monorepo-ts/shared'
import { isAdmin } from '~/modules/auth/middleware.js'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { auditMessages } from './constants.js'

/** Creates the audit router plugin for Fastify. */
export function getAuditRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/audit — requires audit:read permission
    // Platform admins see all logs; org admins see only their org's logs.
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

        // Scope non-admin users to their active organization
        if (!isAdmin(request)) {
          const orgId = (request.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined
          if (orgId) {
            query.organizationId = orgId
          }
        }

        const [data, total] = await Promise.all([
          repository.query(query),
          repository.count(query),
        ])

        reply.code(200).send({ data, total })
      },
    )
  }
}
