import { context, trace } from '@opentelemetry/api'

/**
 * Pino mixin that injects OpenTelemetry trace context (`traceId`, `spanId`)
 * into every log entry. Enables log-trace correlation in Grafana (Loki <-> Tempo).
 *
 * Returns an empty object when no active span exists (safe no-op).
 *
 * Compatible with Pino's `MixinFn` signature — extra arguments are ignored.
 *
 * @example
 * ```ts
 * import pino from 'pino'
 * import { otelMixin } from '@template-monorepo-ts/logger'
 *
 * const logger = pino({ mixin: otelMixin })
 * ```
 */
export function otelMixin(_mergeObject?: object, _level?: number): Record<string, string> {
  const span = trace.getSpan(context.active())
  if (span) {
    const { traceId, spanId } = span.spanContext()
    return { traceId, spanId }
  }
  return {}
}
