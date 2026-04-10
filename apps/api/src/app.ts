/* eslint-disable antfu/no-top-level-await */
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { AppConfigSchema, ErrorSchema, ForbiddenSchema, ProjectSchema, ThemeConfigSchema, UnauthorizedSchema } from '@template-monorepo-ts/shared'
import fastify from 'fastify'
import z from 'zod'
import { setupModules } from '~/modules/index.js'
import { getApiRouter } from '~/resources/index.js'
import { config, fastifyConf, fastifyOtelInstrumentation, handleError, httpRequestDuration, swaggerConf, swaggerUiConf } from '~/utils/index.js'

const isTest = process.env.NODE_ENV === 'test'

/**
 * Convert a Zod schema to a Fastify-compatible JSON Schema with the given $id.
 * The $id is used by @fastify/swagger to name the schema in components/schemas.
 */
function toNamedSchema(zodSchema: z.ZodType, $id: string): Record<string, unknown> {
  const { $schema: _drop, ...json } = z.toJSONSchema(zodSchema) as Record<string, unknown>
  return { $id, ...json }
}

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
  // Register domain models as named JSON schemas so that @fastify/swagger
  // exposes them in the OpenAPI `components/schemas` section, making them
  // visible in Swagger UI's "Schemas" panel — the same way BetterAuth does.
  .addSchema(toNamedSchema(ProjectSchema, 'Project'))
  .addSchema(toNamedSchema(ThemeConfigSchema, 'ThemeConfig'))
  .addSchema(toNamedSchema(AppConfigSchema, 'AppConfig'))
  .addSchema(toNamedSchema(ErrorSchema, 'Error'))
  .addSchema(toNamedSchema(UnauthorizedSchema, 'Unauthorized'))
  .addSchema(toNamedSchema(ForbiddenSchema, 'Forbidden'))
  .register(fastifyOtelInstrumentation.plugin())
  .register(helmet)
  .register(async (instance) => {
    if (!isTest) await instance.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
  })
  .register(cookie)
  .register(cors, {
    origin: config.auth.trustedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
  // @ts-expect-error -- swaggerConf is compatible at runtime; the readonly literal type is not assignable to the mutable SwaggerOptions interface
  .register(swagger, swaggerConf)
  .register(swaggerUi, swaggerUiConf)
  .register(async (instance) => {
    // Redirect root to the frontend when a trusted origin is configured.
    // Catches users who land on the API domain (e.g. from BetterAuth error pages).
    if (config.auth.trustedOrigins.length > 0) {
      instance.get('/', (_req, reply) => reply.redirect(config.auth.trustedOrigins[0]))
    }

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
