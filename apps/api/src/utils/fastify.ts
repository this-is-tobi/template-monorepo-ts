import { randomUUID } from 'node:crypto'
import type { FastifyServerOptions } from 'fastify'
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import type { SwaggerOptions } from '@fastify/swagger'
import { loggerConf } from './logger.js'
import { getNodeEnv } from './functions.js'
import { host, port, appVersion } from './env.js'
import { apiPrefix } from './router.js'

export const fastifyConf: FastifyServerOptions = {
  logger: loggerConf[getNodeEnv()],
  genReqId: () => randomUUID(),
}

export const swaggerConf: SwaggerOptions = {
  swagger: {
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
      { name: 'Examples', description: 'Examples related end-points' },
      { name: 'System', description: 'System related end-points' },
    ],
  },
}

export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: `${apiPrefix}/documentation`,
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
}
