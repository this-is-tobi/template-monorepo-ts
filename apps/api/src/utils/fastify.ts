import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import type { RouteDefinition } from '@template-monorepo-ts/shared'
import type { FastifyReply, FastifyRequest, FastifyServerOptions } from 'fastify'
import type { ZodTypeAny } from 'zod'
import { randomUUID } from 'node:crypto'
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
  body?: ZodTypeAny | JsonSchema
  querystring?: ZodTypeAny | JsonSchema
  params?: ZodTypeAny | JsonSchema
  headers?: ZodTypeAny | JsonSchema
  response?: Record<string, ZodTypeAny | JsonSchema>
  _zodSchemas?: {
    body?: ZodTypeAny
    querystring?: ZodTypeAny
    params?: ZodTypeAny
    headers?: ZodTypeAny
    response?: Record<string, ZodTypeAny>
  }
}

/**
 * Fastify configuration options
 */
export const fastifyConf: FastifyServerOptions = {
  routerOptions: {
    maxParamLength: 5000,
  },
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
function isZodSchema(obj: unknown): obj is ZodTypeAny {
  return obj !== null && typeof obj === 'object' && '_def' in obj && typeof (obj as ZodTypeAny).parse === 'function'
}

/**
 * Helper function to convert Zod schema to OpenAPI-compatible JSON Schema
 */
function toOpenApiSchema(zodSchema: ZodTypeAny | JsonSchema): JsonSchema {
  if (!isZodSchema(zodSchema)) {
    // Already a plain object, return as-is
    return zodSchema as JsonSchema
  }
  const jsonSchema = z.toJSONSchema(zodSchema)
  // Remove $schema property as it's not needed in OpenAPI
  const { $schema: _$schema, ...openApiSchema } = jsonSchema as JsonSchema & { $schema?: string }
  return openApiSchema
}

/**
 * Transform Zod schemas to JSON Schema for Swagger
 * See: https://zod.dev/json-schema
 */
function zodSchemaTransform({ schema, url }: { schema: Record<string, unknown>, url: string }) {
  const transformedSchema: Record<string, unknown> = {}

  // Type guard to check if schema has our custom structure
  const typedSchema = schema as Partial<FastifySchemaWithZod>

  if (typedSchema?.tags) {
    transformedSchema.tags = typedSchema.tags
  }

  if (typedSchema?.summary) {
    transformedSchema.summary = typedSchema.summary
  }

  if (typedSchema?.description) {
    transformedSchema.description = typedSchema.description
  }

  if (typedSchema?.security) {
    transformedSchema.security = typedSchema.security
  }

  if (typedSchema?.hide !== undefined) {
    transformedSchema.hide = typedSchema.hide
  }

  // Check for Zod schemas in custom property first (preferred), then fall back to schema properties
  const zodSchemas = typedSchema?._zodSchemas || typedSchema

  // Transform Zod schemas to JSON Schema using Zod's built-in z.toJSONSchema() method
  if (zodSchemas?.body) {
    transformedSchema.body = toOpenApiSchema(zodSchemas.body)
  }

  if (zodSchemas?.querystring) {
    transformedSchema.querystring = toOpenApiSchema(zodSchemas.querystring)
  }

  if (zodSchemas?.params) {
    transformedSchema.params = toOpenApiSchema(zodSchemas.params)
  }

  if (zodSchemas?.headers) {
    transformedSchema.headers = toOpenApiSchema(zodSchemas.headers)
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
      description: 'Manage resources with fastify API.',
      version: config.api.version,
    },
    externalDocs,
    tags: [
      { name: 'Users', description: 'Users related endpoints' },
      { name: 'System', description: 'System related endpoints' },
    ],
  },
  // Type assertion needed because we extend the schema with custom _zodSchemas property
  transform: zodSchemaTransform,
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
