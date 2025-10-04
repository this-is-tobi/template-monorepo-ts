import type { FastifyRequest } from 'fastify'
import { addReqLogs, loggerConf } from './logger.js'

describe('utils - logger', () => {
  let mockReq: FastifyRequest

  beforeEach(() => {
    mockReq = {
      log: {
        error: vi.fn(),
        info: vi.fn(),
      },
    } as unknown as FastifyRequest
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('loggerConf', () => {
    it('should have the correct configuration for different environments', () => {
      expect(loggerConf).toHaveProperty('development')
      expect(loggerConf).toHaveProperty('production')
      expect(loggerConf).toHaveProperty('test')

      expect(loggerConf.development).toHaveProperty('transport')
      expect(loggerConf.development.transport).toHaveProperty('target', 'pino-pretty')

      expect(loggerConf.production).toBe(true)
      expect(loggerConf.test).toBe(false)
    })
  })

  describe('addReqLogs', () => {
    it('should log info when no error is provided', () => {
      const message = 'test message'
      const infos = { testKey: 'testValue' }

      addReqLogs({ req: mockReq, message, infos })

      expect(mockReq.log.info).toHaveBeenCalledWith(
        {
          description: message,
          infos,
        },
        'processing request',
      )
      expect(mockReq.log.error).not.toHaveBeenCalled()
    })

    it('should log error when an Error object is provided', () => {
      const message = 'error message'
      const error = new Error('test error')
      error.stack = 'test stack trace'

      addReqLogs({ req: mockReq, message, error })

      expect(mockReq.log.error).toHaveBeenCalledWith(
        {
          description: message,
          infos: undefined,
          error: {
            message: 'test error',
            trace: 'test stack trace',
          },
        },
        'processing request',
      )
      expect(mockReq.log.info).not.toHaveBeenCalled()
    })

    it('should log error when a string error is provided', () => {
      const message = 'error message'
      const error = 'string error'

      addReqLogs({ req: mockReq, message, error })

      expect(mockReq.log.error).toHaveBeenCalledWith(
        {
          description: message,
          infos: undefined,
          error: {
            message: 'string error',
            trace: undefined,
          },
        },
        'processing request',
      )
      expect(mockReq.log.info).not.toHaveBeenCalled()
    })

    it('should log error when a record error is provided', () => {
      const message = 'error message'
      const error = { message: 'record error' }

      addReqLogs({ req: mockReq, message, error })

      expect(mockReq.log.error).toHaveBeenCalledWith(
        {
          description: message,
          infos: undefined,
          error: {
            message: 'record error',
            trace: undefined,
          },
        },
        'processing request',
      )
      expect(mockReq.log.info).not.toHaveBeenCalled()
    })

    it('should handle error object without message property', () => {
      const message = 'error message'
      const error = {}

      addReqLogs({ req: mockReq, message, error })

      expect(mockReq.log.error).toHaveBeenCalledWith(
        {
          description: message,
          infos: undefined,
          error: {
            message: 'unexpected error',
            trace: undefined,
          },
        },
        'processing request',
      )
      expect(mockReq.log.info).not.toHaveBeenCalled()
    })
  })
})
