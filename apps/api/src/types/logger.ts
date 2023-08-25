import type { FastifyRequest } from 'fastify'
import type { PinoLoggerOptions } from 'fastify/types/logger.js'

export type LoggerConf = {
  development: PinoLoggerOptions
  production: boolean,
  test: boolean,
}

export interface ReqLogsInput {
  req: FastifyRequest
  error?: string | Error
  description: string
  extras?: Record<string, string>
}
