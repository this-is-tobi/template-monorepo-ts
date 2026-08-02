import type { RuntimeConfigEntry } from '@template-monorepo-ts/shared'
import { createLogger } from '@template-monorepo-ts/logger'

/**
 * Which `OTEL_*` variables this server reads, and what they fall back to.
 *
 * These deliberately keep their SDK-standard spelling instead of joining
 * `ConfigSchema` under an `OTEL__` prefix. The OpenTelemetry SDK reads its own
 * environment, including plenty of variables the app never touches
 * (`OTEL_RESOURCE_ATTRIBUTES`, `OTEL_EXPORTER_OTLP_HEADERS`,
 * `OTEL_TRACES_SAMPLER`, …). Re-spelling them would break the convention every
 * operator, sidecar and collector chart already expects, and would silently
 * drop everything not explicitly re-mapped.
 *
 * Kept free of `@opentelemetry/*` imports so config introspection can describe
 * telemetry without importing — and therefore initialising — the SDK.
 */

const otelLogger = createLogger({ name: 'otel' })

/** Prometheus scrape port used when `OTEL_METRICS_PORT` is unset or invalid. */
export const DEFAULT_METRICS_PORT = 9000

/** Service name reported on every span and metric when unset. */
export const DEFAULT_SERVICE_NAME = 'api'

/**
 * The SDK's own default OTLP/HTTP endpoint. Not applied by this app — the
 * exporters read the variable themselves — but stated here so introspection
 * can report the endpoint actually in use rather than an empty cell.
 *
 * @see https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
 */
export const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318'

/** Whether a raw env value is a usable TCP port. */
function isValidPort(raw: string): boolean {
  const port = Number(raw)
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

interface OtelEnvVar {
  /** SDK-standard variable name. */
  name: string
  /** Dot path for config introspection — groups these under `otel`. */
  path: string
  /** Value in effect when the variable is unset or rejected. */
  fallback: string
  /** Rejects unusable values so introspection reports the effective one. */
  accept?: (raw: string) => boolean
}

const OTEL_ENV_VARS: readonly OtelEnvVar[] = [
  { name: 'OTEL_SDK_DISABLED', path: 'otel.sdkDisabled', fallback: 'false' },
  { name: 'OTEL_SERVICE_NAME', path: 'otel.serviceName', fallback: DEFAULT_SERVICE_NAME },
  { name: 'OTEL_EXPORTER_OTLP_ENDPOINT', path: 'otel.exporterOtlpEndpoint', fallback: DEFAULT_OTLP_ENDPOINT },
  { name: 'OTEL_METRICS_PORT', path: 'otel.metricsPort', fallback: String(DEFAULT_METRICS_PORT), accept: isValidPort },
]

/**
 * The telemetry environment this process started with.
 *
 * Snapshotted at import time for the same reason `config.ts` records its boot
 * layers: reading `process.env` again at request time can report a value the
 * running SDK never saw.
 */
const bootEnv: Record<string, string | undefined> = Object.fromEntries(
  OTEL_ENV_VARS.map(({ name }) => [name, process.env[name]]),
)

/**
 * Prometheus scrape port, guarded.
 *
 * A typo would otherwise reach `PrometheusExporter` as `NaN`, which binds an
 * arbitrary port — the scrape target goes dark with nothing in the logs to say
 * why. Fall back loudly instead. `Number` rather than `Number.parseInt` so
 * `"9000x"` is rejected outright rather than silently truncated.
 */
export function resolveMetricsPort(raw: string | undefined = bootEnv.OTEL_METRICS_PORT): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_METRICS_PORT
  if (!isValidPort(raw)) {
    otelLogger.warn(`OTEL_METRICS_PORT="${raw}" is not a valid port — falling back to ${DEFAULT_METRICS_PORT}`)
    return DEFAULT_METRICS_PORT
  }
  return Number(raw)
}

/** Service name reported on spans and metrics. */
export function resolveServiceName(raw: string | undefined = bootEnv.OTEL_SERVICE_NAME): string {
  return raw?.trim() ? raw : DEFAULT_SERVICE_NAME
}

/**
 * Describe the telemetry variables for the runtime-config view, in the same
 * shape as the schema-derived entries.
 *
 * None are secret: an endpoint, a port and two labels. Credentials for a
 * collector travel in `OTEL_EXPORTER_OTLP_HEADERS`, which the SDK consumes
 * directly and this app deliberately never reads or reports.
 *
 * A value that fails `accept` is reported as `default`, because the default is
 * what the process is actually running with — the point of the view is to show
 * that the variable did not land.
 */
export function describeOtelEntries(env: Record<string, string | undefined> = bootEnv): RuntimeConfigEntry[] {
  return OTEL_ENV_VARS.map(({ name, path, fallback, accept }) => {
    const raw = env[name]
    const usable = raw !== undefined && raw.trim() !== '' && (!accept || accept(raw))
    return {
      path,
      envVar: name,
      value: usable ? raw : fallback,
      source: usable ? 'env' : 'default',
      secret: false,
      isSet: true,
    }
  })
}
