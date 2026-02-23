import { FastifyOtelInstrumentation } from '@fastify/otel'
/**
 * OpenTelemetry SDK initialization module
 *
 * This module MUST be imported before any other application module to ensure
 * the trace and metric providers are registered before Fastify initializes.
 *
 * Uses manual provider setup instead of NodeSDK for Bun runtime compatibility.
 * Node.js auto-instrumentations (e.g. HttpInstrumentation) rely on `require`
 * hooks that are not supported by Bun. Instead:
 * - HTTP Traces: `@fastify/otel` plugin creates HTTP request spans at the Fastify level
 * - DB Traces: `@prisma/instrumentation` hooks into Prisma Client internals (no require hooks)
 * - Metrics: Custom Fastify `onResponse` hook records request duration via OTel Meter API
 *
 * Configuration is handled via standard OTEL_* environment variables:
 * - OTEL_SERVICE_NAME: Service name (default: "api")
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Collector endpoint (default: "http://localhost:4318")
 * - OTEL_SDK_DISABLED: Set to "true" to disable the SDK entirely
 * - OTEL_METRICS_PORT: Prometheus scrape endpoint port (default: 9000)
 *
 * @see https://opentelemetry.io/docs/languages/sdk-configuration/general/
 * @see https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing
 */
import { metrics } from '@opentelemetry/api'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { PrismaInstrumentation, registerInstrumentations } from '@prisma/instrumentation'

const isEnabled = process.env.NODE_ENV !== 'test' && process.env.OTEL_SDK_DISABLED !== 'true'

/**
 * Fastify OTel instrumentation instance.
 * Must be registered as a plugin via `fastifyOtelInstrumentation.plugin()` in app.ts.
 *
 * `registerOnInitialization` is always false because we explicitly register
 * via `.plugin()` — enabling it would auto-patch Fastify via module hooks,
 * causing a duplicate decorator error when `.plugin()` is also called.
 */
export const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  registerOnInitialization: false,
})

let tracerProvider: NodeTracerProvider | undefined
let meterProvider: MeterProvider | undefined

if (isEnabled) {
  const resource = resourceFromAttributes({
    'service.name': process.env.OTEL_SERVICE_NAME ?? 'api',
  })

  // Trace provider — NodeTracerProvider automatically configures
  // AsyncLocalStorage context manager and W3C trace context propagation
  tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  })

  // Register Prisma instrumentation — hooks into Prisma Client internals
  // to produce prisma:client:operation, prisma:client:db_query, prisma:client:serialize spans
  // Must be registered BEFORE provider.register() per Prisma docs
  registerInstrumentations({
    tracerProvider,
    instrumentations: [new PrismaInstrumentation()],
  })

  tracerProvider.register()

  // Metric provider — dual export:
  // 1. OTLP push to collector (for Grafana dashboards via spanmetrics connector)
  // 2. Prometheus pull endpoint on OTEL_METRICS_PORT (for Kubernetes serviceMonitor)
  const metricsPort = Number.parseInt(process.env.OTEL_METRICS_PORT ?? '9000', 10)
  meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      }),
      new PrometheusExporter({ port: metricsPort, preventServerStart: false }),
    ],
  })
  metrics.setGlobalMeterProvider(meterProvider)
}

// HTTP request duration histogram — records in the Fastify onResponse hook (app.ts)
// When disabled, metrics.getMeter() returns a NoopMeter (safe no-op)
const meter = metrics.getMeter('api')
export const httpRequestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'Duration of HTTP server requests',
  unit: 's',
})

/**
 * Gracefully shuts down the OpenTelemetry SDK, flushing all pending telemetry data.
 * Safe to call even when the SDK is disabled (no-op).
 */
export async function shutdownOtel(): Promise<void> {
  await tracerProvider?.shutdown()
  await meterProvider?.shutdown()
}
