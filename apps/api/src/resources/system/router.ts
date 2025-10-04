import type { FastifyInstance } from 'fastify'
import { systemRoutes } from '@template-monorepo-ts/shared'
import { config, createRouteOptions } from '~/utils/index.js'

export function getSystemRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/version
    app.get(systemRoutes.getVersion.path, createRouteOptions(systemRoutes.getVersion), async (_request, reply) => {
      reply.code(200).send({
        version: config.api.version,
      })
    })

    // GET /api/v1/healthz
    app.get(systemRoutes.getHealth.path, createRouteOptions(systemRoutes.getHealth), async (_request, reply) => {
      reply.code(200).send({
        status: 'OK',
      })
    })
  }
}
