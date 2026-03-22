import type { AppConfig } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { configRoutes } from '@template-monorepo-ts/shared'
import { isAdmin } from '~/modules/auth/middleware.js'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { configMessages } from './constants.js'
import { getConfigQuery, getSsoProviders, upsertConfigQuery } from './queries.js'

export function getConfigRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/config — public (needed before login to check registration)
    app.get(
      configRoutes.getConfig.path,
      { ...createRouteOptions(configRoutes.getConfig) },
      async (_request, reply) => {
        const config = await getConfigQuery()
        reply.code(200).send({ data: config, ssoProviders: getSsoProviders() })
      },
    )

    // PUT /api/v1/config — admin only
    app.put(
      configRoutes.updateConfig.path,
      { ...createRouteOptions(configRoutes.updateConfig), preHandler: [app.requireAuth, createZodValidationHandler(configRoutes.updateConfig)] },
      async (request, reply) => {
        if (!isAdmin(request)) {
          reply.code(403).send({
            message: configMessages.forbidden,
            error: 'ADMIN_REQUIRED',
          })
          return
        }

        const config = await upsertConfigQuery(request.body as AppConfig)
        reply.code(200).send({
          message: configMessages.updated,
          data: config,
        })
      },
    )
  }
}
