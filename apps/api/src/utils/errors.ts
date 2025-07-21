import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from './logger.js'

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
