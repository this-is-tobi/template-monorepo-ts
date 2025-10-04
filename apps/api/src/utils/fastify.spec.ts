import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
      expect(fastifyConf).toHaveProperty('maxParamLength', 5000)
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
      } as any

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

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
  })
})
