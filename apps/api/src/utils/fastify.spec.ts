import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fastifyConf, swaggerConf, swaggerUiConf } from './fastify.js'

// Mock the crypto module
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('mocked-uuid'),
}))

// Mock the config module
vi.mock('./config.js', () => ({
  config: {
    doc: {
      url: 'http://doc.config.domain.com',
    },
    api: {
      version: '1.0.0',
    },
    getNodeEnv: vi.fn().mockReturnValue('test'),
  },
  getNodeEnv: vi.fn().mockReturnValue('test'),
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
      expect(swaggerConf).toHaveProperty('info')
      expect(swaggerConf.info).toHaveProperty('title', 'Fastify Template')
      expect(swaggerConf.info).toHaveProperty('description', 'Manage resources with fastify API.')
      expect(swaggerConf.info).toHaveProperty('version')

      expect(swaggerConf).toHaveProperty('externalDocs')

      expect(swaggerConf).toHaveProperty('tags')
      expect(swaggerConf.tags).toHaveLength(2)
      expect(swaggerConf.tags[0]).toHaveProperty('name', 'Users')
      expect(swaggerConf.tags[1]).toHaveProperty('name', 'System')
    })

    it('should handle external docs with URL', () => {
      // Since the URL is already provided by the mock
      expect(swaggerConf.externalDocs).toEqual({
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
})
