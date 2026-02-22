/* eslint-disable antfu/no-top-level-await */
import type { SwaggerOptions } from '@fastify/swagger'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fastify from 'fastify'
import { getApiRouter } from '~/resources/index.js'
import { fastifyConf, handleError, swaggerConf, swaggerUiConf } from '~/utils/index.js'

/**
 * Main Fastify application instance
 * Configured with security headers, Swagger docs, and API routes
 */
const app = fastify(fastifyConf)
  .register(helmet)
  .register(swagger, swaggerConf as unknown as SwaggerOptions)
  .register(swaggerUi, swaggerUiConf)
  .register(getApiRouter())
  .addHook('onRoute', (opts) => {
    if (opts.path.includes('/healthz') || opts.path.includes('/readyz') || opts.path.includes('/livez')) {
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
