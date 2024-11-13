import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import type { FastifyServerOptions } from 'fastify'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { getNodeEnv } from './functions.js'
import { loggerConf } from './logger.js'

export const fastifyConf: FastifyServerOptions = {
  maxParamLength: 5000,
  logger: loggerConf[getNodeEnv()],
  genReqId: () => randomUUID(),
}

const externalDocs = config.doc?.url
  ? { description: 'External documentation.', url: config.doc?.url }
  : {}

export const swaggerConf = {
  info: {
    title: 'Fastify Template',
    description: 'Manage resources with fastify API.',
    version: config.api.version,
  },
  externalDocs,
  tags: [
    { name: 'Users', description: 'Users related endpoints' },
    { name: 'System', description: 'System related endpoints' },
  ],
}

export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: '/swagger-ui',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
}
