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

    // GET /api/v1/organizations/:organizationId/audit — org-scoped audit logs.
    // Requires audit:read permission within the specific organization.
    // The organizationId filter is always enforced from the path param;
    // any organizationId value in the query string is stripped to prevent
    // cross-org data leaks.
    app.get(
      auditRoutes.getOrgAuditLogs.path,
      {
        ...createRouteOptions(auditRoutes.getOrgAuditLogs),
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(auditRoutes.getOrgAuditLogs),
          app.requirePermission({
            permissions: { audit: ['read'] },
            getOrganizationId: req => (req.params as Record<string, string>).organizationId,
          }),
        ],
      },
      async (request, reply) => {
        const repository = app.auditRepository
        if (!repository) {
          return reply.code(501).send({ message: auditMessages.unavailable })
        }

        const { organizationId } = request.params as { organizationId: string }
        const query = request.query as AuditQueryOptions

        // Enforce org scope — strip any caller-supplied organizationId and
        // replace it with the validated path param.  This is the key security
        // guarantee: callers cannot read another org's logs by overriding the filter.
        delete query.organizationId
        query.organizationId = organizationId

        const [data, total] = await Promise.all([
          repository.query(query),
          repository.count(query),
        ])

        return reply.code(200).send({ data, total })
      },
    )
  }
}
