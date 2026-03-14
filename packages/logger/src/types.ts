import type { Logger as PinoLogger, LoggerOptions as PinoLoggerOptions } from 'pino'

/**
 * Supported log levels, from most verbose to least.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'

/**
 * Destination for log output.
 *
 * - `'stdout'` — standard output (default, suitable for most apps)
 * - `'stderr'` — standard error (required for MCP stdio mode where stdout is the JSON-RPC wire)
 * - `number`   — raw file descriptor (1 = stdout, 2 = stderr)
 */
export type LogDestination = 'stdout' | 'stderr' | number

/**
 * Options for creating a logger instance via `createLogger`.
 */
export interface CreateLoggerOptions {
  /** Logger name — appears in every log entry as `name` field. */
  name?: string

  /**
   * Minimum log level. Defaults to `LOG_LEVEL` env var, then `'info'` in
   * production, `'debug'` in development, and `'silent'` in test.
   */
  level?: LogLevel

  /**
   * Output destination.
   *
   * - `'stdout'` — fd 1 (default for most apps)
   * - `'stderr'` — fd 2 (required for MCP stdio mode)
   * - `number`   — raw file descriptor
   */
  destination?: LogDestination

  /**
   * Enable pretty-printing (human-readable logs).
   * Defaults to `true` in development, `false` otherwise.
   */
  pretty?: boolean

  /**
   * Enable OpenTelemetry trace context injection (traceId, spanId).
   * Defaults to `true` when `@opentelemetry/api` is available.
   */
  otel?: boolean

  /**
   * Additional Pino options merged into the logger configuration.
   * Allows advanced customisation without breaking the factory defaults.
   */
  pinoOptions?: PinoLoggerOptions
}

/**
 * Thin logger interface that mirrors the Pino API surface used across the
 * monorepo. Consumers should depend on this interface, not on Pino directly.
 */
export interface Logger {
  trace: PinoLogger['trace']
  debug: PinoLogger['debug']
  info: PinoLogger['info']
  warn: PinoLogger['warn']
  error: PinoLogger['error']
  fatal: PinoLogger['fatal']

  /** The current minimum log level. */
  level: string

  /**
   * Create a child logger with additional bound properties.
   * Follows the Pino `child()` semantics.
   */
  child: PinoLogger['child']

  /**
   * A silent no-op logger (level = 'silent'). Useful for tests.
   */
  silent: PinoLogger['silent']

  /**
   * Access the raw Pino instance.
   * Use sparingly — prefer the `Logger` interface methods.
   */
  readonly pino: PinoLogger
}
