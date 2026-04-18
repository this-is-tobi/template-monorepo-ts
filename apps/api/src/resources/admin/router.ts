import type { AdminApiKeyQuery, AdminOrganizationQuery } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { adminRoutes } from '@template-monorepo-ts/shared'
import { createProtection, createRouteOptions, getRouteParam } from '~/utils/index.js'
import { countAdminApiKeys, countAdminOrganizations, getAdminApiKeyByIdQuery, getAdminApiKeysQuery, getAdminOrganizationByIdQuery, getAdminOrganizationsQuery, getAdminUserApiKeysQuery, getAdminUserByIdQuery } from './queries.js'

/** Creates the admin router plugin for Fastify. */
export function getAdminRouter() {
  return async (app: FastifyInstance) => {
    const protect = createProtection(app)

    // GET /api/v1/admin/organizations
    app.get(
      adminRoutes.getAdminOrganizations.path,
      { ...createRouteOptions(adminRoutes.getAdminOrganizations), preHandler: protect.admin(adminRoutes.getAdminOrganizations) },
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

    // GET /api/v1/admin/organizations/:id
    app.get(
      adminRoutes.getAdminOrganizationById.path,
      { ...createRouteOptions(adminRoutes.getAdminOrganizationById), preHandler: protect.admin(adminRoutes.getAdminOrganizationById) },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const org = await getAdminOrganizationByIdQuery(id)

        if (!org) {
          reply.code(404).send({ message: 'Organization not found', error: 'NOT_FOUND' })
          return
        }

        reply.code(200).send({ data: org })
      },
    )

    // GET /api/v1/admin/api-keys
    app.get(
      adminRoutes.getAdminApiKeys.path,
      { ...createRouteOptions(adminRoutes.getAdminApiKeys), preHandler: protect.admin(adminRoutes.getAdminApiKeys) },
      async (request, reply) => {
        const query = request.query as AdminApiKeyQuery
        const [data, total] = await Promise.all([
          getAdminApiKeysQuery(query),
          countAdminApiKeys(query),
        ])

        reply.code(200).send({ data, total })
      },
    )

    // GET /api/v1/admin/api-keys/:id
    app.get(
      adminRoutes.getAdminApiKeyById.path,
      { ...createRouteOptions(adminRoutes.getAdminApiKeyById), preHandler: protect.admin(adminRoutes.getAdminApiKeyById) },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const data = await getAdminApiKeyByIdQuery(id)

        if (!data) {
          reply.code(404).send({ message: 'API key not found', error: 'NOT_FOUND' })
          return
        }

        reply.code(200).send({ data })
      },
    )

    // GET /api/v1/admin/users/:id
    app.get(
      adminRoutes.getAdminUserById.path,
      { ...createRouteOptions(adminRoutes.getAdminUserById), preHandler: protect.admin(adminRoutes.getAdminUserById) },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const [user, apiKeys] = await Promise.all([
          getAdminUserByIdQuery(id),
          getAdminUserApiKeysQuery(id),
        ])

        if (!user) {
          reply.code(404).send({ message: 'User not found', error: 'NOT_FOUND' })
          return
        }

        const { members, ownedProjects, ...userData } = user
        const data = {
          ...userData,
          memberships: members.map(m => ({
            id: m.id,
            role: m.role,
            createdAt: m.createdAt,
            organization: m.organization,
          })),
          projects: ownedProjects,
          apiKeys,
        }

        reply.code(200).send({ data })
      },
    )
  }
}
