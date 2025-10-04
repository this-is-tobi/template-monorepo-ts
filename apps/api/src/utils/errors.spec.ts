import type { FastifyReply, FastifyRequest } from 'fastify'
import { handleError } from './errors.js'
import * as logger from './logger.js'

vi.mock('./logger.js', () => ({
  addReqLogs: vi.fn(),
}))

describe('utils - errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('handleError', () => {
    it('should log and return error response', () => {
      const error = new Error('Test error')
      error.stack = 'Error stack trace'

      const mockReq = {} as FastifyRequest
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply

      handleError(error, mockReq, mockRes)

      expect(logger.addReqLogs).toHaveBeenCalledWith({
        req: mockReq,
        message: 'unexpected error',
        error: {
          message: 'Test error',
          trace: 'Error stack trace',
        },
      })

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.send).toHaveBeenCalledWith({
        message: 'unexpected error',
        error: 'Test error',
      })
    })
  })
})
