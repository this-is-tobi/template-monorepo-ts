import { randomUUID } from 'node:crypto'
import type { FastifyServerOptions } from 'fastify'
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import { loggerConf } from './logger.js'
import { getNodeEnv } from './functions.js'
import { config } from '@/utils/index.js'

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
  servers: [
    { url: `http://${config.api.domain}` },
    { url: `https://${config.api.domain}` },
  ],
  tags: [
    { name: 'Users', description: 'Users related end-points' },
    { name: 'System', description: 'System related end-points' },
  ],
}

export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: '/swagger-ui',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
}
