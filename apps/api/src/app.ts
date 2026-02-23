/* eslint-disable antfu/no-top-level-await */
import type { SwaggerOptions } from '@fastify/swagger'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fastify from 'fastify'
import { getApiRouter } from '~/resources/index.js'
import { fastifyConf, fastifyOtelInstrumentation, handleError, httpRequestDuration, swaggerConf, swaggerUiConf } from '~/utils/index.js'

/**
 * Main Fastify application instance
 * Configured with security headers, Swagger docs, OpenTelemetry, and API routes
 */
const app = fastify(fastifyConf)
  .register(fastifyOtelInstrumentation.plugin())
  .register(helmet)
  .register(swagger, swaggerConf as unknown as SwaggerOptions)
  .register(swaggerUi, swaggerUiConf)
  .register(getApiRouter())
  .addHook('onRoute', (opts) => {
    if (opts.path.includes('/healthz') || opts.path.includes('/readyz') || opts.path.includes('/livez')) {
      opts.logLevel = 'silent'
      opts.config = { ...opts.config, otel: false }
    }
  })
  .addHook('onResponse', (request, reply, done) => {
    // Record HTTP request duration for Prometheus metrics
    // Skips health check endpoints to avoid noise
    if (!request.url.includes('/healthz') && !request.url.includes('/readyz') && !request.url.includes('/livez')) {
      httpRequestDuration.record((reply.elapsedTime ?? 0) / 1000, {
        'http.request.method': request.method,
        'http.response.status_code': reply.statusCode,
        'http.route': request.routeOptions?.url ?? request.url,
      })
    }
    done()
  })
  .setErrorHandler(handleError)

await app.ready()

/**
 * Application logger instance from Fastify
 */
export const appLogger = app.log

export default app
