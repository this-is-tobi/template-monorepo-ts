import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ZodError } from 'zod'
import { addReqLogs } from './logger.js'

export const handleError = (error: Error, req: FastifyRequest, res: FastifyReply) => {
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

export const buildZodReport = (zodError: ZodError) => {
  return zodError.errors.reduce((acc, cur) => {
    return {
      ...acc,
      [cur.path[0]]: cur.message,
    }
  }, {} as Record<string, string>)
}
