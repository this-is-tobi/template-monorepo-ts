import type { FastifyInstance } from 'fastify'
import { systemRoutes } from '@template-monorepo-ts/shared'
import { getRedisClient } from '~/modules/auth/redis.js'
import { db } from '~/prisma/clients.js'
import { config, createRouteOptions } from '~/utils/index.js'

interface ComponentStatus {
  status: 'ok' | 'unavailable'
  message?: string
}

async function probeDatabase(): Promise<ComponentStatus> {
  try {
    await db.$queryRaw`SELECT 1`
    return { status: 'ok' }
  } catch {
    return { status: 'unavailable', message: 'Database is not reachable' }
  }
}

async function probeRedis(): Promise<ComponentStatus> {
  const client = getRedisClient(config.auth)
  if (!client) return { status: 'ok', message: 'Not configured (using DB sessions)' }
  try {
    await client.ping()
    return { status: 'ok' }
  } catch {
    return { status: 'unavailable', message: 'Redis is not reachable' }
  }
}

async function probeKeycloak(): Promise<ComponentStatus> {
  if (!config.keycloak.enabled) return { status: 'ok', message: 'Not enabled' }
  const issuer = config.keycloak.issuer.replace(/\/$/, '')
  try {
    const res = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(3000) })
    return res.ok
      ? { status: 'ok' }
      : { status: 'unavailable', message: `Keycloak responded with ${res.status}` }
  } catch {
    return { status: 'unavailable', message: 'Keycloak is not reachable' }
  }
}

/** Creates the system router plugin for Fastify. */
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

    // GET /api/v1/readyz — readiness probe: per-component status check.
    app.get(systemRoutes.getReady.path, createRouteOptions(systemRoutes.getReady), async (_request, reply) => {
      const [database, redis, keycloak] = await Promise.all([
        probeDatabase(),
        probeRedis(),
        probeKeycloak(),
      ])
      const components = { database, redis, keycloak }
      const allOk = Object.values(components).every(c => c.status === 'ok')
      reply.code(allOk ? 200 : 503).send({
        status: allOk ? 'OK' : 'KO',
        components,
      })
    })

    // GET /api/v1/livez — liveness probe: is the process alive and not stuck?
    app.get(systemRoutes.getLive.path, createRouteOptions(systemRoutes.getLive), async (_request, reply) => {
      reply.code(200).send({
        status: 'OK',
      })
    })
  }
}
