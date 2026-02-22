import type { FastifyInstance } from 'fastify'
import { systemRoutes } from '@template-monorepo-ts/shared'
import { db } from '~/prisma/clients.js'
import { config, createRouteOptions } from '~/utils/index.js'

export function getSystemRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/version
    app.get(systemRoutes.getVersion.path, createRouteOptions(systemRoutes.getVersion), async (_request, reply) => {
      reply.code(200).send({
        version: config.api.version,
      })
    })

    // GET /api/v1/healthz — startup probe: is the server process running?
    app.get(systemRoutes.getHealth.path, createRouteOptions(systemRoutes.getHealth), async (_request, reply) => {
      reply.code(200).send({
        status: 'OK',
      })
    })

    // GET /api/v1/readyz — readiness probe: can the service handle traffic?
    app.get(systemRoutes.getReady.path, createRouteOptions(systemRoutes.getReady), async (_request, reply) => {
      try {
        await db.$queryRawUnsafe('SELECT 1')
        reply.code(200).send({ status: 'OK' })
      } catch {
        reply.code(503).send({ status: 'KO', message: 'Database is not reachable' })
      }
    })

    // GET /api/v1/livez — liveness probe: is the process alive and not stuck?
    app.get(systemRoutes.getLive.path, createRouteOptions(systemRoutes.getLive), async (_request, reply) => {
      reply.code(200).send({
        status: 'OK',
      })
    })
  }
}
