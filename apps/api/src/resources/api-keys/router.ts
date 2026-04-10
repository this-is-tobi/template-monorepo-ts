import type { UpdateApiKeyBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { apiKeyRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { getApiKeyByIdQuery, updateApiKeyQuery, validateApiKeyScope } from './queries.js'

/** Creates the user-facing API key router plugin for Fastify. */
export function getApiKeyRouter() {
  return async (app: FastifyInstance) => {
    // PUT /api/v1/api-keys/:id — update an API key owned by the caller
    app.put(
      apiKeyRoutes.updateApiKey.path,
      {
        ...createRouteOptions(apiKeyRoutes.updateApiKey),
        preHandler: [app.requireAuth, createZodValidationHandler(apiKeyRoutes.updateApiKey)],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const body = request.body as UpdateApiKeyBody
        const userId = request.session!.user.id

        const existing = await getApiKeyByIdQuery(id)
        if (!existing) {
          reply.code(404).send({ message: 'API key not found', error: 'NOT_FOUND' })
          return
        }

        // Ownership check — users may only update their own keys
        if (existing.referenceId !== userId) {
          reply.code(403).send({ message: 'Forbidden' })
          return
        }

        // Build Prisma update payload
        const data: { name?: string, permissions?: string | null, metadata?: string | null } = {}
        if (body.name !== undefined) {
          data.name = body.name
        }
        if (body.permissions !== undefined) {
          data.permissions = body.permissions ? JSON.stringify(body.permissions) : null
        }
        if (body.organizationIds !== undefined || body.projectIds !== undefined) {
          // Validate that the user actually has access to the scoped orgs/projects
          const scopeCheck = await validateApiKeyScope(userId, body.organizationIds, body.projectIds)
          if (!scopeCheck.valid) {
            reply.code(403).send({ message: scopeCheck.reason, error: 'INVALID_SCOPE' })
            return
          }

          const meta: Record<string, unknown> = {}
          if (body.organizationIds && body.organizationIds.length > 0) {
            meta.organizationIds = body.organizationIds
          }
          if (body.projectIds && body.projectIds.length > 0) {
            meta.projectIds = body.projectIds
          }
          data.metadata = Object.keys(meta).length > 0 ? JSON.stringify(meta) : null
        }

        const updated = await updateApiKeyQuery(id, data)
        reply.code(200).send({ data: updated })
      },
    )
  }
}
