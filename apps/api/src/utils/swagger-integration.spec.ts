/**
 * Integration test: verify that @fastify/swagger produces correct request body
 * and response schemas for routes registered with createRouteOptions(), and that
 * named schemas registered via fastify.addSchema() appear in components/schemas.
 *
 * This test creates a minimal Fastify instance (no DB / auth needed) to confirm
 * the zodSchemaTransform pipeline and the addSchema-based named-models feature
 * both work end-to-end.
 */
import fastifySwagger from '@fastify/swagger'
import fastify from 'fastify'
import { z } from 'zod'
import { createRouteOptions, swaggerConf } from './fastify.js'

// ---------------------------------------------------------------------------
// Mock config – minimal values required by swaggerConf / fastifyConf
// ---------------------------------------------------------------------------
vi.mock('./config.js', () => ({
  config: {
    env: 'test',
    api: { name: 'test', version: '0.0.0', host: 'localhost', port: 3000, timeout: 5000, prefix: '/api' },
    log: { level: 'silent', pretty: false },
    doc: undefined,
  },
}))

// ---------------------------------------------------------------------------
// Schemas used in test
// ---------------------------------------------------------------------------

const BodyZod = z.object({ name: z.string().min(1), description: z.string().optional() })
const Response201Zod = z.object({ message: z.string().optional(), data: z.object({ id: z.string(), name: z.string() }) })
const ErrorZod = z.object({ message: z.string().optional(), error: z.string().optional() })

const testRoute = {
  method: 'POST' as const,
  path: '/api/v1/projects',
  tags: ['Projects'],
  summary: 'Create project',
  description: 'Create a new project',
  body: BodyZod,
  responses: {
    201: Response201Zod,
    400: ErrorZod,
    401: z.object({ message: z.string() }),
  },
}

// Named schema to register via addSchema – simulates the production
// .addSchema(toNamedSchema(ProjectSchema, 'Project')) call in app.ts
const ProjectForSwagger = {
  $id: 'Project',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string' },
    ownerId: { type: 'string' },
  },
  required: ['id', 'name', 'ownerId'],
  additionalProperties: false,
}

async function buildApp() {
  const app = fastify({ logger: false })
  // Simulate what app.ts does: register named schemas BEFORE swagger
  app.addSchema(ProjectForSwagger)
  // Register swagger with the full swaggerConf (including refResolver)
  await app.register(fastifySwagger, swaggerConf as any)

  app.post(
    testRoute.path,
    { ...createRouteOptions(testRoute) },
    async (_req, reply) => reply.code(201).send({ data: { id: '1', name: 'test' } }),
  )

  await app.ready()
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('swagger integration – schemas present in OpenAPI output', () => {
  let swaggerJson: Record<string, unknown>

  beforeAll(async () => {
    const app = await buildApp()
    swaggerJson = (app as any).swagger() as Record<string, unknown>
  })

  it('route POST /api/v1/projects should be in paths', () => {
    const paths = swaggerJson.paths as Record<string, unknown>
    expect(paths).toHaveProperty('/api/v1/projects')
    const post = (paths['/api/v1/projects'] as Record<string, unknown>).post as Record<string, unknown>
    expect(post).toBeDefined()
  })

  it('pOST /api/v1/projects should have a requestBody with JSON Schema', () => {
    const paths = swaggerJson.paths as Record<string, unknown>
    const post = (paths['/api/v1/projects'] as Record<string, unknown>).post as Record<string, unknown>
    const requestBody = post.requestBody as Record<string, unknown>
    expect(requestBody).toBeDefined()
    const schema = ((requestBody.content as any)['application/json'] as any).schema
    expect(schema).toBeDefined()
    expect(schema.type).toBe('object')
    expect(schema.properties).toHaveProperty('name')
  })

  it('pOST /api/v1/projects should have responses with JSON Schema', () => {
    const paths = swaggerJson.paths as Record<string, unknown>
    const post = (paths['/api/v1/projects'] as Record<string, unknown>).post as Record<string, unknown>
    const responses = post.responses as Record<string, unknown>
    expect(responses).toBeDefined()
    expect(responses).toHaveProperty('201')
    expect(responses).toHaveProperty('400')
    expect(responses).toHaveProperty('401')
    const r201 = responses['201'] as Record<string, unknown>
    const schema201 = ((r201.content as any)?.['application/json'] as any)?.schema
    expect(schema201).toBeDefined()
    expect(schema201.type).toBe('object')
  })

  it('named schemas registered via addSchema appear in components/schemas', () => {
    const components = swaggerJson.components as Record<string, unknown>
    expect(components).toBeDefined()
    const schemas = components.schemas as Record<string, unknown>
    expect(schemas).toBeDefined()
    // 'Project' was added via addSchema — should be visible in Swagger UI's Schemas panel
    expect(schemas).toHaveProperty('Project')
    const project = schemas.Project as Record<string, unknown>
    expect(project.type).toBe('object')
    expect(project).toHaveProperty('properties')
  })
})
