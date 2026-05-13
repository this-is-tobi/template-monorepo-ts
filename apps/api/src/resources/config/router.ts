import type { AppConfig } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { configRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { configMessages } from './constants.js'
import { getConfigQuery, getLockedConfigFields, getSsoProviders, upsertConfigQuery } from './queries.js'

/** Creates the config router plugin for Fastify. */
export function getConfigRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/config — public (needed before login to check registration)
    app.get(
      configRoutes.getConfig.path,
      { ...createRouteOptions(configRoutes.getConfig) },
      async (_request, reply) => {
        const config = await getConfigQuery()
        reply.code(200).send({ data: config, ssoProviders: getSsoProviders(), lockedFields: getLockedConfigFields() })
      },
    )

    // PUT /api/v1/config — requires config:update permission
    app.put(
      configRoutes.updateConfig.path,
      { ...createRouteOptions(configRoutes.updateConfig), preHandler: [app.requireAuth, createZodValidationHandler(configRoutes.updateConfig), app.requirePermission({ config: ['update'] })] },
      async (request, reply) => {
        const before = await getConfigQuery()
        const config = await upsertConfigQuery(request.body as AppConfig)
        app.auditLogger?.logAsync({
          actorId: request.session!.user.id,
          action: 'config:update',
          resourceType: 'config',
          details: { before, after: config },
        })
        reply.code(200).send({
          message: configMessages.updated,
          data: config,
        })
      },
    )
  }
}
