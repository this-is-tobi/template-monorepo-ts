import type { AdminApiKeyQuery, AdminOrganizationQuery } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { adminRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { countAdminApiKeys, countAdminOrganizations, getAdminApiKeysQuery, getAdminOrganizationsQuery } from './queries.js'

export function getAdminRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/admin/organizations
    app.get(
      adminRoutes.getAdminOrganizations.path,
      { ...createRouteOptions(adminRoutes.getAdminOrganizations), preHandler: [app.requireAuth, createZodValidationHandler(adminRoutes.getAdminOrganizations), app.requireRole('admin')] },
      async (request, reply) => {
        const query = request.query as AdminOrganizationQuery
        const [rawData, total] = await Promise.all([
          getAdminOrganizationsQuery(query),
          countAdminOrganizations(query),
        ])

        const data = rawData.map(({ _count, ...org }) => ({
          ...org,
          memberCount: _count.members,
        }))

        reply.code(200).send({ data, total })
      },
    )

    // GET /api/v1/admin/api-keys
    app.get(
      adminRoutes.getAdminApiKeys.path,
      { ...createRouteOptions(adminRoutes.getAdminApiKeys), preHandler: [app.requireAuth, createZodValidationHandler(adminRoutes.getAdminApiKeys), app.requireRole('admin')] },
      async (request, reply) => {
        const query = request.query as AdminApiKeyQuery
        const [data, total] = await Promise.all([
          getAdminApiKeysQuery(query),
          countAdminApiKeys(query),
        ])

        reply.code(200).send({ data, total })
      },
    )
  }
}
