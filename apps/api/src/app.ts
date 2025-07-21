/* eslint-disable antfu/no-top-level-await */
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { getContract } from '@template-monorepo-ts/shared'
import { initServer } from '@ts-rest/fastify'
import { generateOpenApi } from '@ts-rest/open-api'
import fastify from 'fastify'
import { getApiRouter } from '~/resources/index.js'
import { fastifyConf, handleError, swaggerConf, swaggerUiConf } from '~/utils/index.js'

/**
 * Server instance for handling API requests via ts-rest
 */
export const serverInstance = initServer()

/**
 * OpenAPI document generated from the API contract
 */
const openApiDocument = generateOpenApi(await getContract(), swaggerConf, { setOperationId: true })

/**
 * Main Fastify application instance
 * Configured with security headers, Swagger docs, and API routes
 */
const app = fastify(fastifyConf)
  .register(helmet)
  .register(swagger, { transformObject: () => openApiDocument })
  .register(swaggerUi, swaggerUiConf)
  .register(getApiRouter())
  .addHook('onRoute', (opts) => {
    if (opts.path.includes('/healthz')) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(handleError)

await app.ready()

/**
 * Application logger instance from Fastify
 */
export const appLogger = app.log

export default app
