import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from './logger.js'
import { EnhanceErrorData } from '@/types/errors.js'

export class EnhanceError extends Error {
  public description: string
  public extras: Record<string, string>
  public statusCode: number

  constructor (message: string, data?: EnhanceErrorData) {
    super(message)
    this.description = data?.description || message
    this.extras = data?.extras || {}
    this.statusCode = 500
  }
}

export class BadRequestError extends EnhanceError {
  statusCode = 400
}

export class UnauthorizedError extends EnhanceError {
  statusCode = 401
}

export class ForbiddenError extends EnhanceError {
  statusCode = 403
}

export class NotFoundError extends EnhanceError {
  statusCode = 404
}

export class ConflictError extends EnhanceError {
  statusCode = 409
}

export class TooManyRequestError extends EnhanceError {
  statusCode = 429
}

export class ServerError extends EnhanceError {
  statusCode = 500
}

export const handleError = (error: EnhanceError | Error, req: FastifyRequest, res: FastifyReply) => {
  const isEnhanceError = error instanceof EnhanceError

  const statusCode = isEnhanceError ? error.statusCode : 500
  const description = isEnhanceError ? error.description : error.message
  res.status(statusCode).send({ status: statusCode, error: description })
  addReqLogs({
    req,
    description,
    ...(isEnhanceError ? { extras: error.extras } : {}),
    error: isEnhanceError ? undefined : error,
  })
}
