import type { FastifyRequest } from 'fastify'
import type { PinoLoggerOptions } from 'fastify/types/logger.js'

export interface LoggerConf {
  development: PinoLoggerOptions
  production: boolean
  test: boolean
}

export interface ReqLogsInput {
  req: FastifyRequest
  message: string
  infos?: Record<string, unknown>
  error?: Record<string, unknown> | string | Error
}

export const loggerConf: LoggerConf = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd - HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
        singleLine: true,
      },
    },
  },
  production: true,
  test: false,
}

export function addReqLogs({ req, error, message, infos }: ReqLogsInput) {
  const logInfos = {
    description: message,
    infos,
  }

  if (error) {
    const errorInfos = {
      ...logInfos,
      error: {
        message: typeof error === 'string' ? error : error?.message || 'unexpected error',
        trace: error instanceof Error ? error?.stack : undefined,
      },
    }
    req.log.error(errorInfos, 'processing request')
    return
  }

  req.log.info(logInfos, 'processing request')
}
