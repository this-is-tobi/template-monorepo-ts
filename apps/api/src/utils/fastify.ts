import { randomUUID } from 'node:crypto'
import type { FastifyServerOptions } from 'fastify'
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import { loggerConf } from './logger.js'
import { getNodeEnv } from './functions.js'
import { host, port, appVersion } from './env.js'
import { apiPrefix } from '@/misc/router.js'

export const fastifyConf: FastifyServerOptions = {
  maxParamLength: 5000,
  logger: loggerConf[getNodeEnv()],
  genReqId: () => randomUUID(),
}

export const swaggerConf = {
  info: {
    title: 'Fastify Template',
    description: 'Manage resources with fastify API.',
    version: appVersion,
  },
  host: `${host}:${port}`,
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    { name: 'Users', description: 'Users related end-points' },
    { name: 'System', description: 'System related end-points' },
  ],
}

export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: `${apiPrefix}/documentation`,
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
}
