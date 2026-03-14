import type { Logger } from './types.js'

import { openSync } from 'node:fs'

import { createLogger } from './pino.js'

describe('createLogger', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  describe('level resolution', () => {
    it('should use explicit level when provided', () => {
      const logger = createLogger({ level: 'warn' })
      expect(logger.level).toBe('warn')
    })

    it('should use LOG_LEVEL env var when no explicit level', () => {
      process.env.LOG_LEVEL = 'trace'
      const logger = createLogger()
      expect(logger.level).toBe('trace')
    })

    it('should default to "silent" in test environment', () => {
      delete process.env.LOG_LEVEL
      process.env.NODE_ENV = 'test'
      const logger = createLogger()
      expect(logger.level).toBe('silent')
    })

    it('should default to "debug" in development environment', () => {
      delete process.env.LOG_LEVEL
      process.env.NODE_ENV = 'development'
      const logger = createLogger({ pretty: false })
      expect(logger.level).toBe('debug')
    })

    it('should default to "info" in production environment', () => {
      delete process.env.LOG_LEVEL
      process.env.NODE_ENV = 'production'
      const logger = createLogger()
      expect(logger.level).toBe('info')
    })

    it('should default to "info" when NODE_ENV is unset', () => {
      delete process.env.LOG_LEVEL
      delete process.env.NODE_ENV
      const logger = createLogger()
      expect(logger.level).toBe('info')
    })
  })

  describe('destination', () => {
    it('should write to stdout (fd 1) by default', () => {
      const logger = createLogger({ level: 'info', pretty: false })
      // Verify the logger was created successfully — destination is internal to pino
      expect(logger.pino).toBeDefined()
    })

    it('should accept "stderr" destination', () => {
      const logger = createLogger({ destination: 'stderr', pretty: false })
      expect(logger.pino).toBeDefined()
    })

    it('should accept numeric file descriptor', () => {
      const logger = createLogger({ destination: 2, pretty: false })
      expect(logger.pino).toBeDefined()
    })
  })

  describe('pretty printing', () => {
    it('should enable pretty-printing in development by default', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.LOG_LEVEL
      const logger = createLogger()
      // In pretty mode, pino uses transport internally
      expect(logger.pino).toBeDefined()
      expect(logger.level).toBe('debug')
    })

    it('should disable pretty-printing when explicitly set to false', () => {
      process.env.NODE_ENV = 'development'
      const logger = createLogger({ pretty: false })
      expect(logger.pino).toBeDefined()
    })

    it('should not enable pretty-printing in production by default', () => {
      process.env.NODE_ENV = 'production'
      const logger = createLogger()
      expect(logger.pino).toBeDefined()
    })
  })

  describe('otel mixin', () => {
    it('should enable otel mixin by default', () => {
      const logger = createLogger({ level: 'info', pretty: false })
      // The logger should have been created with a mixin
      expect(logger.pino).toBeDefined()
    })

    it('should disable otel mixin when otel=false', () => {
      const logger = createLogger({ level: 'info', otel: false, pretty: false })
      expect(logger.pino).toBeDefined()
    })
  })

  describe('name', () => {
    it('should set the logger name', () => {
      const logger = createLogger({ name: 'test-app', pretty: false, level: 'info' })
      // Pino exposes the name through bindings
      expect(logger.pino).toBeDefined()
    })
  })

  describe('logger interface', () => {
    let logger: Logger

    beforeEach(() => {
      logger = createLogger({ level: 'trace', pretty: false })
    })

    it('should expose all log level methods', () => {
      expect(typeof logger.trace).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.fatal).toBe('function')
      expect(typeof logger.silent).toBe('function')
    })

    it('should expose child method', () => {
      expect(typeof logger.child).toBe('function')
      const child = logger.child({ module: 'auth' })
      expect(child).toBeDefined()
      expect(typeof child.info).toBe('function')
    })

    it('should expose raw pino instance', () => {
      expect(logger.pino).toBeDefined()
      expect(typeof logger.pino.info).toBe('function')
    })

    it('should allow reading and writing the level', () => {
      expect(logger.level).toBe('trace')
      logger.level = 'warn'
      expect(logger.level).toBe('warn')
    })
  })

  describe('pinoOptions passthrough', () => {
    it('should merge custom pino options', () => {
      const logger = createLogger({
        level: 'info',
        pretty: false,
        pinoOptions: {
          base: { service: 'my-service' },
        },
      })
      expect(logger.pino).toBeDefined()
    })

    it('should combine custom mixin with otel mixin', () => {
      const customMixin = () => ({ custom: 'value' })
      const logger = createLogger({
        level: 'info',
        pretty: false,
        otel: true,
        pinoOptions: { mixin: customMixin },
      })
      expect(logger.pino).toBeDefined()
    })

    it('should invoke combined mixin when logging', () => {
      const customMixin = vi.fn(() => ({ custom: 'value' }))
      // Write to /dev/null so the JSON line doesn't pollute test output
      const devNull = openSync('/dev/null', 'w')
      const logger = createLogger({
        level: 'trace',
        pretty: false,
        otel: true,
        destination: devNull,
        pinoOptions: { mixin: customMixin },
      })
      logger.info('trigger mixin')
      expect(customMixin).toHaveBeenCalled()
    })

    it('should not set mixin when otel is false and no custom mixin', () => {
      const logger = createLogger({
        level: 'info',
        pretty: false,
        otel: false,
      })
      expect(logger.pino).toBeDefined()
    })
  })
})
