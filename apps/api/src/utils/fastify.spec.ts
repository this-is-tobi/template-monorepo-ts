import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { createRouteOptions, createZodValidationHandler, fastifyConf, swaggerConf, swaggerUiConf } from './fastify.js'

// Mock the crypto module
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('mocked-uuid'),
}))

// Mock the config module
vi.mock('./config.js', () => ({
  config: {
    env: 'test',
    api: {
      name: 'test-api',
      version: '1.0.0',
      host: 'localhost',
      port: 3000,
      timeout: 5000,
      prefix: '/api',
    },
    log: {
      level: 'info',
      pretty: false,
    },
    doc: {
      url: 'http://doc.config.domain.com',
    },
  },
}))

describe('utils - fastify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fastifyConf', () => {
    it('should have the correct configuration', () => {
      expect(fastifyConf.routerOptions).toHaveProperty('maxParamLength', 5000)
      expect(fastifyConf).toHaveProperty('logger')
      expect(typeof fastifyConf.genReqId).toBe('function')
    })
  })

  describe('swaggerConf', () => {
    it('should have the correct configuration', () => {
      expect(swaggerConf).toHaveProperty('openapi')
      expect(swaggerConf.openapi).toHaveProperty('info')
      expect(swaggerConf.openapi.info).toHaveProperty('title', 'Fastify Template')
      expect(swaggerConf.openapi.info).toHaveProperty('description', 'Manage resources with fastify API.')
      expect(swaggerConf.openapi.info).toHaveProperty('version')

      expect(swaggerConf.openapi).toHaveProperty('externalDocs')

      expect(swaggerConf.openapi).toHaveProperty('tags')
      expect(swaggerConf.openapi.tags).toHaveLength(2)
      expect(swaggerConf.openapi.tags[0]).toHaveProperty('name', 'Users')
      expect(swaggerConf.openapi.tags[1]).toHaveProperty('name', 'System')
    })

    it('should handle external docs with URL', () => {
      // Since the URL is already provided by the mock
      expect(swaggerConf.openapi.externalDocs).toEqual({
        description: 'External documentation.',
        url: 'http://doc.config.domain.com',
      })
    })
  })

  describe('swaggerUiConf', () => {
    it('should have the correct configuration', () => {
      expect(swaggerUiConf).toHaveProperty('routePrefix', '/swagger-ui')
      expect(swaggerUiConf).toHaveProperty('uiConfig')
      expect(swaggerUiConf.uiConfig).toHaveProperty('docExpansion', 'list')
      expect(swaggerUiConf.uiConfig).toHaveProperty('deepLinking', true)
    })
  })

  describe('createZodValidationHandler', () => {
    it('should validate params successfully', async () => {
      const mockRoute = {
        method: 'GET' as const,
        path: '/test/:id',
        params: z.object({ id: z.string() }),
        responses: {},
      }

      const mockRequest = {
        params: { id: 'test-123' },
      } as unknown as FastifyRequest

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply

      const handler = createZodValidationHandler(mockRoute)
      await handler(mockRequest, mockReply)

      expect(mockRequest.params).toEqual({ id: 'test-123' })
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should validate query successfully', async () => {
      const mockRoute = {
        method: 'GET' as const,
        path: '/test',
        query: z.object({ limit: z.string() }),
        responses: {},
      }

      const mockRequest = {
        query: { limit: '10' },
      } as any

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

      const handler = createZodValidationHandler(mockRoute)
      await handler(mockRequest, mockReply)

      expect(mockRequest.query).toEqual({ limit: '10' })
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should validate body successfully', async () => {
      const mockRoute = {
        method: 'POST' as const,
        path: '/test',
        body: z.object({ name: z.string() }),
        responses: {},
      }

      const mockRequest = {
        body: { name: 'test-name' },
      } as any

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

      const handler = createZodValidationHandler(mockRoute)
      await handler(mockRequest, mockReply)

      expect(mockRequest.body).toEqual({ name: 'test-name' })
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const mockRoute = {
        method: 'POST' as const,
        path: '/test',
        body: z.object({ name: z.string(), email: z.email() }),
        responses: {},
      }

      const mockRequest = {
        body: { name: 'test', email: 'invalid-email' },
      } as any

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue(undefined),
      } as any

      const handler = createZodValidationHandler(mockRoute)
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: expect.any(String),
      })
    })

    it('should handle non-Error validation failures', async () => {
      const mockRoute = {
        method: 'POST' as const,
        path: '/test',
        body: z.object({ name: z.string() }),
        responses: {},
      }

      const mockRequest = {
        body: { name: 123 }, // Wrong type
      } as any

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue(undefined),
      } as any

      const handler = createZodValidationHandler(mockRoute)
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: expect.any(String),
      })
    })

    it('should skip validation for routes without schemas', async () => {
      const mockRoute = {
        method: 'GET' as const,
        path: '/test',
        responses: {},
      }

      const mockRequest = {} as any
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

      const handler = createZodValidationHandler(mockRoute)
      await handler(mockRequest, mockReply)

      expect(mockReply.code).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })
  })

  describe('createRouteOptions', () => {
    it('should create route options with schema and preHandler', () => {
      const mockRoute = {
        method: 'GET' as const,
        path: '/test',
        tags: ['Test'],
        summary: 'Test route',
        description: 'A test route',
        responses: {},
      }

      const options = createRouteOptions(mockRoute)

      expect(options).toHaveProperty('schema')
      expect(options.schema).toEqual({
        tags: ['Test'],
        summary: 'Test route',
        description: 'A test route',
        response: {},
      })
      expect(options).toHaveProperty('preHandler')
      expect(typeof options.preHandler).toBe('function')
    })

    it('should handle routes without tags', () => {
      const mockRoute = {
        method: 'GET' as const,
        path: '/test',
        summary: 'Test route',
        description: 'A test route',
        responses: {},
      }

      const options = createRouteOptions(mockRoute)

      expect(options.schema.tags).toEqual([])
      expect(options.schema.summary).toBe('Test route')
      expect(options.schema.description).toBe('A test route')
    })

    it('should include Zod schemas in route options', () => {
      const mockRoute = {
        method: 'POST' as const,
        path: '/test',
        summary: 'Test route',
        tags: ['Test'],
        params: z.object({ id: z.string() }),
        query: z.object({ limit: z.string() }),
        body: z.object({ name: z.string() }),
        responses: {
          200: z.object({ success: z.boolean() }),
        },
      }

      const options = createRouteOptions(mockRoute)

      // Zod schemas for request validation are stored in _zodSchemas
      expect(options.schema._zodSchemas).toBeDefined()
      expect(options.schema._zodSchemas?.params).toBeDefined()
      expect(options.schema._zodSchemas?.querystring).toBeDefined()
      expect(options.schema._zodSchemas?.body).toBeDefined()
      // Response schemas are transformed to JSON Schema
      expect(options.schema.response).toBeDefined()
      expect(options.schema.response?.[200]).toBeDefined()
      expect((options.schema.response?.[200] as Record<string, unknown>)?.type).toBe('object')
    })
  })

  describe('swaggerConf.transform', () => {
    it('should transform Zod schemas to JSON Schema', () => {
      const mockSchema = {
        tags: ['Users'],
        summary: 'Create user',
        description: 'Create a new user',
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          limit: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              id: z.string(),
              name: z.string(),
            }),
          }),
          400: z.object({
            error: z.string(),
          }),
        },
      }

      const result = swaggerConf.transform({ schema: mockSchema, url: '/api/users' })

      expect(result.url).toBe('/api/users')
      expect(result.schema.tags).toEqual(['Users'])
      expect(result.schema.summary).toBe('Create user')
      expect(result.schema.description).toBe('Create a new user')

      // Check that Zod schemas were converted to JSON Schema
      const body = result.schema.body as Record<string, unknown>
      expect(body).toBeDefined()
      expect(body.type).toBe('object')
      expect(body.properties).toBeDefined()
      expect((body.properties as Record<string, unknown>).name).toEqual({ type: 'string' })
      // Zod's toJSONSchema adds both format and pattern for email validation
      const email = (body.properties as Record<string, Record<string, unknown>>).email
      expect(email.type).toBe('string')
      expect(email.format).toBe('email')
      expect(email.pattern).toBeDefined()

      const params = result.schema.params as Record<string, unknown>
      expect(params).toBeDefined()
      expect(params.type).toBe('object')
      expect((params.properties as Record<string, unknown>).id).toEqual({ type: 'string' })

      const querystring = result.schema.querystring as Record<string, unknown>
      expect(querystring).toBeDefined()
      expect(querystring.type).toBe('object')

      const response = result.schema.response as Record<string, Record<string, unknown>>
      expect(response).toBeDefined()
      expect(response['200']).toBeDefined()
      expect(response['200'].type).toBe('object')
      expect(response['400']).toBeDefined()
    })

    it('should handle schema with hide property', () => {
      const mockSchema = {
        hide: true,
        summary: 'Hidden route',
      }

      const result = swaggerConf.transform({ schema: mockSchema, url: '/api/hidden' })

      expect(result.url).toBe('/api/hidden')
      expect(result.schema.hide).toBe(true)
    })

    it('should handle schema without optional fields', () => {
      const mockSchema = {
        summary: 'Simple route',
      }

      const result = swaggerConf.transform({ schema: mockSchema, url: '/api/simple' })

      expect(result.url).toBe('/api/simple')
      expect(result.schema.summary).toBe('Simple route')
      expect(result.schema.body).toBeUndefined()
      expect(result.schema.params).toBeUndefined()
      expect(result.schema.querystring).toBeUndefined()
      expect(result.schema.response).toBeUndefined()
    })

    it('should handle security schema', () => {
      const mockSchema = {
        summary: 'Secured route',
        security: [{ apiKey: [] }],
      }

      const result = swaggerConf.transform({ schema: mockSchema, url: '/api/secured' })

      expect(result.url).toBe('/api/secured')
      expect(result.schema.security).toEqual([{ apiKey: [] }])
    })
  })
})
