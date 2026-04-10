import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import type { RouteDefinition } from '@template-monorepo-ts/shared'
import type { FastifyReply, FastifyRequest, FastifyServerOptions } from 'fastify'
import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import z from 'zod'
import { config } from './config.js'
import { getNodeEnv } from './functions.js'
import { loggerConf } from './logger.js'

/**
 * Type for JSON Schema objects
 */
type JsonSchema = Record<string, unknown>

/**
 * Type for Fastify schema with optional Zod schemas
 */
interface FastifySchemaWithZod {
  readonly tags?: readonly string[]
  summary?: string
  description?: string
  security?: readonly Record<string, readonly string[]>[]
  hide?: boolean
  body?: z.ZodType | JsonSchema
  querystring?: z.ZodType | JsonSchema
  params?: z.ZodType | JsonSchema
  headers?: z.ZodType | JsonSchema
  response?: Record<string, z.ZodType | JsonSchema>
  _zodSchemas?: {
    body?: z.ZodType
    querystring?: z.ZodType
    params?: z.ZodType
    headers?: z.ZodType
    response?: Record<string, z.ZodType>
  }
}

/**
 * Fastify configuration options
 */
export const fastifyConf: FastifyServerOptions = {
  routerOptions: {
    maxParamLength: 500,
  },
  bodyLimit: 1_048_576,
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
 * Helper function to check if an object is a Zod schema
 */
function isZodSchema(obj: unknown): obj is z.ZodType {
  return obj !== null && typeof obj === 'object' && '_def' in obj && typeof (obj as z.ZodType).parse === 'function'
}

/**
 * Recursively strip `propertyNames` from a JSON Schema object.
 *
 * Zod's `z.record(z.string(), …)` emits `propertyNames: { type: "string" }`
 * which is redundant (all JSON keys are strings) and triggers Ajv/fast-json-
 * stringify warnings in strict mode.
 */
function stripPropertyNames(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripPropertyNames)
  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'propertyNames') continue
      out[k] = stripPropertyNames(v)
    }
    return out
  }
  return obj
}

/**
 * Helper function to convert Zod schema to OpenAPI-compatible JSON Schema
 */
function toOpenApiSchema(zodSchema: z.ZodType | JsonSchema): JsonSchema {
  if (!isZodSchema(zodSchema)) {
    // Already a plain object, return as-is
    return zodSchema as JsonSchema
  }
  const jsonSchema = z.toJSONSchema(zodSchema)
  // Remove $schema property as it's not needed in OpenAPI
  const { $schema: _$schema, ...openApiSchema } = jsonSchema as JsonSchema & { $schema?: string }
  return stripPropertyNames(openApiSchema) as JsonSchema
}

/**
 * Transform Zod schemas to JSON Schema for Swagger
 * See: https://zod.dev/json-schema
 */
function zodSchemaTransform({ schema, url }: { schema: Record<string, unknown>, url: string }) {
  const transformedSchema: Record<string, unknown> = {}

  // Type guard to check if schema has our custom structure
  const typedSchema = schema as Partial<FastifySchemaWithZod>

  // Copy OpenAPI metadata properties
  for (const prop of ['tags', 'summary', 'description', 'security', 'hide'] as const) {
    if (typedSchema?.[prop] !== undefined) {
      transformedSchema[prop] = typedSchema[prop]
    }
  }

  // Check for Zod schemas in custom property first (preferred), then fall back to schema properties
  const zodSchemas = typedSchema?._zodSchemas || typedSchema

  // Transform Zod schemas to JSON Schema using Zod's built-in z.toJSONSchema() method
  for (const prop of ['body', 'querystring', 'params', 'headers'] as const) {
    if (zodSchemas?.[prop]) {
      transformedSchema[prop] = toOpenApiSchema(zodSchemas[prop])
    }
  }

  // Transform response schemas
  if (zodSchemas?.response) {
    const responseSchemas: Record<string, JsonSchema> = {}
    for (const [statusCode, responseSchema] of Object.entries(zodSchemas.response)) {
      if (responseSchema) {
        responseSchemas[statusCode] = toOpenApiSchema(responseSchema)
      }
    }
    if (Object.keys(responseSchemas).length > 0) {
      transformedSchema.response = responseSchemas
    }
  }

  return {
    schema: transformedSchema,
    url,
  }
}

/**
 * Swagger configuration for Fastify
 */
export const swaggerConf = {
  openapi: {
    info: {
      title: 'Fastify Template',
      description: [
        'Manage resources with fastify API.',
        '',
        '## Authentication',
        '',
        'This API uses **BetterAuth** for authentication.',
        '',
        '### Option 1 — Bearer token (Swagger UI)',
        '',
        `1. **Sign in** via \`POST ${apiPrefix.v1}/auth/sign-in/email\`:`,
        '   ```bash',
        '   curl -s -X POST \\',
        '     -H \'Content-Type: application/json\' \\',
        '     -d \'{"email": "your@email.com", "password": "your-password"}\' \\',
        `     http://localhost:8081${apiPrefix.v1}/auth/sign-in/email | jq -r '.token'`,
        '   ```',
        '2. **Copy** the `token` value from the response.',
        '3. **Authorize** — click the 🔓 **Authorize** button above, paste the token into `bearerAuth`, then click **Authorize**.',
        '',
        '### Option 2 — Browse auth endpoints',
        '',
        'Switch to the **Auth API (BetterAuth)** spec using the dropdown in the top-right corner to explore all authentication endpoints (sign-up, OAuth, 2FA, organizations, API keys, etc.).',
        '',
        `A standalone interactive reference may be available at [\`${apiPrefix.v1}/auth/reference\`](${apiPrefix.v1}/auth/reference).`,
      ].join('\n'),
      version: config.api.version,
    },
    externalDocs,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'BetterAuth session token or Bearer token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Session cookie set by BetterAuth',
        },
      },
    },
    security: [
      { bearerAuth: [] },
      { cookieAuth: [] },
    ],
    tags: [
      { name: 'Projects', description: 'Projects related endpoints' },
      { name: 'System', description: 'System related endpoints' },
    ],
  },
  transform: zodSchemaTransform,
  /**
   * Use the schema's $id (when present) as the key in OpenAPI components/schemas.
   * This makes schemas registered via fastify.addSchema({ $id: 'Project', … })
   * appear as "Project" in Swagger UI's Schemas panel, matching the behaviour of
   * BetterAuth's generated spec.  Without this override @fastify/swagger falls
   * back to sequential names like "def-0".
   */
  refResolver: {
    buildLocalReference(
      json: Record<string, unknown>,
      _baseUri: string,
      _fragment: string,
      i: number,
    ) {
      if (typeof json.$id === 'string' && json.$id.length > 0) {
        return json.$id
      }
      return `def-${i}`
    },
  },
} as const

/**
 * Swagger UI configuration for Fastify.
 *
 * Two spec sources are combined in the same UI:
 *  - Application API  — Fastify routes (projects, system, …)
 *  - Auth API         — BetterAuth endpoints, generated by the openAPI() plugin
 *
 * The BetterAuth schema is served at `<basePath>/open-api/generate-schema`
 * which resolves to `/api/v1/auth/open-api/generate-schema` given the
 * configured basePath.  A standalone Scalar reference UI is also available at
 * `/api/v1/auth/reference`.
 */
export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: '/swagger-ui',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    urls: [
      { url: '/swagger-ui/json', name: 'Application API' },
      { url: `${apiPrefix.v1}/auth/open-api/generate-schema`, name: 'Auth API (BetterAuth)' },
    ],
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
      return reply.code(400).send({
        message: 'Validation Error',
        error: error instanceof Error ? error.message : 'Invalid request data',
      })
    }
  }
}

/**
 * Create Fastify route options with Zod schemas for OpenAPI documentation
 * Note: Request validation (params, query, body) is handled by the preHandler using Zod
 * Response schemas are transformed to JSON Schema for Fastify serialization
 */
export function createRouteOptions(route: RouteDefinition) {
  const schema: FastifySchemaWithZod = {
    tags: route.tags || [],
    summary: route.summary,
    description: route.description,
  }

  // Store Zod schemas in a custom property for Swagger transform
  // These won't be used by Fastify for validation, only by zodSchemaTransform for swagger docs
  const zodSchemas: NonNullable<FastifySchemaWithZod['_zodSchemas']> = {}

  if (route.params) {
    zodSchemas.params = route.params
  }

  if (route.query) {
    zodSchemas.querystring = route.query
  }

  if (route.body) {
    zodSchemas.body = route.body
  }

  // Add zodSchemas to schema object for transform function to access
  if (Object.keys(zodSchemas).length > 0) {
    schema._zodSchemas = zodSchemas
  }

  // Transform response schemas to JSON Schema for Fastify serialization
  if (route.responses) {
    schema.response = {}
    zodSchemas.response = {}
    for (const [statusCode, responseSchema] of Object.entries(route.responses)) {
      // Store original Zod schema for Swagger
      zodSchemas.response[statusCode] = responseSchema
      // Transform to JSON Schema for Fastify
      schema.response[statusCode] = isZodSchema(responseSchema)
        ? toOpenApiSchema(responseSchema)
        : (responseSchema as JsonSchema)
    }
  }

  return {
    schema,
    preHandler: createZodValidationHandler(route),
  }
}
