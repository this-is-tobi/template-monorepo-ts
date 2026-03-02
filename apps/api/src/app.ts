/* eslint-disable antfu/no-top-level-await */
import type { SwaggerOptions } from '@fastify/swagger'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fastify from 'fastify'
import { setupModules } from '~/modules/index.js'
import { getApiRouter } from '~/resources/index.js'
import { config, fastifyConf, fastifyOtelInstrumentation, handleError, httpRequestDuration, swaggerConf, swaggerUiConf } from '~/utils/index.js'

/**
 * Check if a path corresponds to a health-check endpoint (excluded from logging & metrics).
 */
function isHealthCheck(path: string) {
  return path.includes('/healthz') || path.includes('/readyz') || path.includes('/livez')
}

/**
 * Main Fastify application instance
 * Configured with security headers, CORS, cookies, Swagger docs, OpenTelemetry,
 * feature modules and API routes.
 *
 * Modules are loaded first so that decorators (e.g. `app.requireAuth`) are
 * available to all routes registered afterwards.
 */
const app = fastify(fastifyConf)
  .register(fastifyOtelInstrumentation.plugin())
  .register(helmet)
  .register(cookie)
  .register(cors, {
    origin: config.auth.trustedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
  .register(swagger, swaggerConf as unknown as SwaggerOptions)
  .register(swaggerUi, swaggerUiConf)
  .register(async (instance) => {
    // 1. Load feature modules — decorators & module routes
    await setupModules(instance)
    // 2. Core API routes — can use module decorators (requireAuth, requireRole)
    await instance.register(getApiRouter())
  })
  .addHook('onRoute', (opts) => {
    if (isHealthCheck(opts.path)) {
      opts.logLevel = 'silent'
      opts.config = { ...opts.config, otel: false }
    }
  })
  .addHook('onResponse', (request, reply, done) => {
    // Record HTTP request duration for Prometheus metrics
    // Skips health check endpoints to avoid noise
    if (!isHealthCheck(request.url)) {
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
