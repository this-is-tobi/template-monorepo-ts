import type { LoggerOptions } from 'pino'
import type { CreateLoggerOptions, LogDestination, Logger, LogLevel } from './types.js'
import pino from 'pino'
import { otelMixin } from './otel.js'

/**
 * Resolve the current Node environment.
 */
function getNodeEnv(): 'development' | 'test' | 'production' {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return process.env.NODE_ENV
  }
  return 'production'
}

/**
 * Resolve the default log level based on `LOG_LEVEL` env var and `NODE_ENV`.
 */
function resolveLevel(explicit?: LogLevel): LogLevel {
  if (explicit) return explicit

  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
  if (envLevel) return envLevel

  const env = getNodeEnv()
  if (env === 'test') return 'silent'
  if (env === 'development') return 'debug'
  return 'info'
}

/**
 * Resolve the file descriptor for the given destination.
 */
function resolveDestination(dest?: LogDestination): number {
  if (dest === 'stderr') return 2
  if (dest === 'stdout' || dest === undefined) return 1
  return dest
}

/**
 * Determine whether pretty-printing should be enabled.
 */
function resolvePretty(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit
  return getNodeEnv() === 'development'
}

/**
 * Build pino-pretty transport options.
 */
function buildPrettyTransport(fd: number): LoggerOptions['transport'] {
  return {
    target: 'pino-pretty',
    options: {
      destination: fd,
      translateTime: 'yyyy-mm-dd - HH:MM:ss Z',
      ignore: 'pid,hostname',
      colorize: true,
      singleLine: true,
    },
  }
}

/**
 * Create a structured logger backed by Pino.
 *
 * Sensible defaults:
 * - Level: `LOG_LEVEL` env → `'silent'` in test, `'debug'` in dev, `'info'` in prod
 * - Destination: stdout (fd 1) unless overridden
 * - Pretty-printing: auto-enabled in development
 * - OTel mixin: auto-enabled (injects traceId/spanId when a span is active)
 *
 * @example
 * ```ts
 * // API — default stdout + otel
 * const logger = createLogger({ name: 'api' })
 *
 * // MCP stdio mode — MUST write to stderr
 * const logger = createLogger({ name: 'mcp', destination: 'stderr' })
 *
 * // Test — silent by default
 * const logger = createLogger({ name: 'test' })
 * ```
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const {
    name,
    level: explicitLevel,
    destination: explicitDest,
    pretty: explicitPretty,
    otel = true,
    pinoOptions = {},
  } = options

  const level = resolveLevel(explicitLevel)
  const fd = resolveDestination(explicitDest)
  const pretty = resolvePretty(explicitPretty)

  const mixins: LoggerOptions['mixin'][] = []
  if (otel) mixins.push(otelMixin as LoggerOptions['mixin'])
  if (pinoOptions.mixin) mixins.push(pinoOptions.mixin)

  const combinedMixin: LoggerOptions['mixin'] = mixins.length > 0
    ? (mergeObject, level, logger) => mixins.reduce<Record<string, unknown>>(
        (acc, fn) => ({ ...acc, ...(fn as NonNullable<LoggerOptions['mixin']>)(mergeObject, level, logger) }),
        {},
      )
    : undefined

  const pinoOpts: LoggerOptions = {
    ...pinoOptions,
    ...(name ? { name } : {}),
    level,
    mixin: combinedMixin,
  }

  // When pretty-printing, use pino-pretty transport (handles its own destination).
  // Otherwise, create a raw destination to the target fd.
  let instance: pino.Logger
  if (pretty) {
    pinoOpts.transport = buildPrettyTransport(fd)
    instance = pino(pinoOpts)
  } else {
    const dest = pino.destination({ fd, sync: false })
    instance = pino(pinoOpts, dest)
  }

  return {
    trace: instance.trace.bind(instance),
    debug: instance.debug.bind(instance),
    info: instance.info.bind(instance),
    warn: instance.warn.bind(instance),
    error: instance.error.bind(instance),
    fatal: instance.fatal.bind(instance),
    silent: instance.silent.bind(instance),
    get level() {
      return instance.level
    },
    set level(value: string) {
      instance.level = value
    },
    child: instance.child.bind(instance),
    get pino() {
      return instance
    },
  }
}
