import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import type { RouteDefinition } from '@template-monorepo-ts/shared'
import type { FastifyReply, FastifyRequest, FastifyServerOptions } from 'fastify'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { getNodeEnv } from './functions.js'
import { loggerConf } from './logger.js'

/**
 * Fastify configuration options
 */
export const fastifyConf: FastifyServerOptions = {
  maxParamLength: 5000,
  logger: loggerConf[getNodeEnv()],
  genReqId: () => randomUUID(),
}

/**
 * Configuration for external documentation in Swagger
 */
const externalDocs = config.doc?.url
  ? { description: 'External documentation.', url: config.doc?.url }
  : undefined

/**
 * Swagger configuration for Fastify
 */
export const swaggerConf = {
  openapi: {
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
  },
}

/**
 * Swagger UI configuration for Fastify
 */
export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: '/swagger-ui',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
}

/**
 * Create a preHandler for Zod validation
 */
export function createZodValidationHandler(route: RouteDefinition) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate params
      if (route.params && request.params) {
        request.params = route.params.parse(request.params)
      }

      // Validate query
      if (route.query && request.query) {
        request.query = route.query.parse(request.query)
      }

      // Validate body
      if (route.body && request.body) {
        request.body = route.body.parse(request.body)
      }
    } catch (error) {
      await reply.code(400).send({
        error: 'Validation Error',
        message: error instanceof Error ? error.message : 'Invalid request data',
      })
    }
  }
}

/**
 * Create Fastify route options with validation and basic schema for OpenAPI
 */
export function createRouteOptions(route: RouteDefinition) {
  return {
    schema: {
      tags: route.tags || [],
      summary: route.summary,
      description: route.description,
    },
    preHandler: createZodValidationHandler(route),
  }
}
