import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from './logger.js'

/**
 * Standard error codes for API responses.
 * Use these for consistent error handling across resources.
 */
export type ErrorCode
  = | 'NOT_FOUND'
    | 'ALREADY_EXISTS'
    | 'FORBIDDEN'
    | 'UNAUTHORIZED'
    | 'BAD_REQUEST'
    | 'CONFLICT'
    | 'INTERNAL_ERROR'

/**
 * Typed API error for consistent error handling.
 * Throw this instead of returning error objects.
 *
 * @example
 * throw new APIError(404, 'NOT_FOUND', 'Project not found')
 */
export class APIError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'APIError'
  }

  /**
   * Serialize error for HTTP response
   */
  toJSON() {
    return {
      message: this.message,
      error: this.code,
    }
  }
}

/**
 * Handles errors in the application.
 * APIError instances return their status code and structured response.
 * Other errors are logged and return 500.
 *
 * @param error - The error that occurred
 * @param req - The Fastify request object
 * @param res - The Fastify response object
 */
export function handleError(error: Error, req: FastifyRequest, res: FastifyReply) {
  if (error instanceof APIError) {
    // Structured API error - return proper status code
    if (!res.sent) {
      res.code(error.statusCode).send(error.toJSON())
    }
    return
  }

  // Unexpected error - log and return 500
  addReqLogs({
    req,
    message: 'unexpected error',
    error: {
      message: error.message,
      trace: error.stack,
    },
  })
  if (!res.sent) {
    res.code(500).send({ message: 'unexpected error', error: error.message })
  }
}
