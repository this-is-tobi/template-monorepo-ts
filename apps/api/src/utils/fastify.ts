import { randomUUID } from 'node:crypto'
import type { FastifyServerOptions } from 'fastify'
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { loggerConf } from './logger.js'
import { getNodeEnv } from './functions.js'
import { apiDomain, apiVersion } from './env.js'

export const fastifyConf: FastifyServerOptions = {
  maxParamLength: 5000,
  logger: loggerConf[getNodeEnv()],
  genReqId: () => randomUUID(),
}

export const swaggerConf = {
  info: {
    title: 'Fastify Template',
    description: 'Manage resources with fastify API.',
    version: apiVersion,
  },
  externalDocs: {
    description: 'External documentation.',
    url: 'https://docs.this-is-tobi.com',
  },
  servers: [
    { url: `http://${apiDomain}` },
    { url: `https://${apiDomain}` },
  ],
  components: {
    securitySchemes: {
      http: {
        type: 'http',
        name: 'http',
        in: 'header',
      },
    },
  },
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
