import type { FastifyRequest } from 'fastify'
import type { PinoLoggerOptions } from 'fastify/types/logger.js'
import { context, trace } from '@opentelemetry/api'

export interface LoggerConf {
  development: PinoLoggerOptions
  production: PinoLoggerOptions
  test: boolean
}

export interface ReqLogsInput {
  req: FastifyRequest
  message: string
  infos?: Record<string, unknown>
  error?: Record<string, unknown> | string | Error
  level?: 'info' | 'warn' | 'error'
}

/**
 * Pino mixin that injects OpenTelemetry trace context (traceId, spanId)
 * into every log entry. Enables log-trace correlation in Grafana (Loki ↔ Tempo).
 * Returns an empty object when no active span exists (safe no-op).
 */
export function otelMixin(): Record<string, string> {
  const span = trace.getSpan(context.active())
  if (span) {
    const { traceId, spanId } = span.spanContext()
    return { traceId, spanId }
  }
  return {}
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
    mixin: otelMixin,
  },
  production: {
    mixin: otelMixin,
  },
  test: false,
}

export function addReqLogs({ req, error, message, infos, level }: ReqLogsInput) {
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

  if (level === 'warn') {
    req.log.warn(logInfos, 'processing request')
    return
  }

  req.log.info(logInfos, 'processing request')
}
