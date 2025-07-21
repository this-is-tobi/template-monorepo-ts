import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from './logger.js'

/**
 * Handles unexpected errors in the application
 * Logs the error details and sends a 500 response
 *
 * @param error - The error that occurred
 * @param req - The Fastify request object
 * @param res - The Fastify response object
 */
export function handleError(error: Error, req: FastifyRequest, res: FastifyReply) {
  addReqLogs({
    req,
    message: 'unexpected error',
    error: {
      message: error.message,
      trace: error.stack,
    },
  })
  res.status(500).send({ message: 'unexpected error', error: error.message })
}
