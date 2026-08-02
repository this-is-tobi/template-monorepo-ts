import { DEFAULT_METRICS_PORT, DEFAULT_OTLP_ENDPOINT, DEFAULT_SERVICE_NAME, describeOtelEntries, resolveMetricsPort, resolveServiceName } from '~/utils/otel-env.js'

describe('otel-env', () => {
  describe('resolveMetricsPort', () => {
    it('should fall back when unset or blank', () => {
      expect(resolveMetricsPort(undefined)).toBe(DEFAULT_METRICS_PORT)
      expect(resolveMetricsPort('')).toBe(DEFAULT_METRICS_PORT)
      expect(resolveMetricsPort('   ')).toBe(DEFAULT_METRICS_PORT)
    })

    it('should accept a valid port', () => {
      expect(resolveMetricsPort('9100')).toBe(9100)
      expect(resolveMetricsPort('1')).toBe(1)
      expect(resolveMetricsPort('65535')).toBe(65535)
    })

    it.each([
      ['not-a-port'],
      // `Number.parseInt` would silently truncate this to 9000 and bind the
      // wrong-looking-but-right port, hiding the typo.
      ['9000x'],
      ['0'],
      ['-1'],
      ['70000'],
      ['9000.5'],
    ])('should reject %s rather than binding an arbitrary port', (raw) => {
      expect(resolveMetricsPort(raw)).toBe(DEFAULT_METRICS_PORT)
    })
  })

  describe('resolveServiceName', () => {
    it('should fall back when unset or blank', () => {
      expect(resolveServiceName(undefined)).toBe(DEFAULT_SERVICE_NAME)
      expect(resolveServiceName('  ')).toBe(DEFAULT_SERVICE_NAME)
    })

    it('should use the configured name', () => {
      expect(resolveServiceName('checkout-api')).toBe('checkout-api')
    })
  })

  describe('describeOtelEntries', () => {
    it('should report the SDK-standard names, not a `__` re-spelling', () => {
      const entries = describeOtelEntries({})

      expect(entries.map(e => e.envVar)).toEqual([
        'OTEL_SDK_DISABLED',
        'OTEL_SERVICE_NAME',
        'OTEL_EXPORTER_OTLP_ENDPOINT',
        'OTEL_METRICS_PORT',
      ])
      // Grouped under `otel` by the admin UI, which splits on the first segment.
      expect(entries.every(e => e.path.startsWith('otel.'))).toBe(true)
    })

    it('should report defaults when nothing is set', () => {
      const entries = describeOtelEntries({})

      expect(entries.every(e => e.source === 'default')).toBe(true)
      expect(entries.find(e => e.path === 'otel.serviceName')?.value).toBe(DEFAULT_SERVICE_NAME)
      expect(entries.find(e => e.path === 'otel.exporterOtlpEndpoint')?.value).toBe(DEFAULT_OTLP_ENDPOINT)
      expect(entries.find(e => e.path === 'otel.metricsPort')?.value).toBe(String(DEFAULT_METRICS_PORT))
    })

    it('should attribute configured values to the env layer', () => {
      const entries = describeOtelEntries({
        OTEL_SERVICE_NAME: 'checkout-api',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318',
      })

      expect(entries.find(e => e.path === 'otel.serviceName')).toMatchObject({ source: 'env', value: 'checkout-api' })
      expect(entries.find(e => e.path === 'otel.exporterOtlpEndpoint')).toMatchObject({ source: 'env', value: 'http://otel-collector:4318' })
      // Untouched vars stay on their default.
      expect(entries.find(e => e.path === 'otel.metricsPort')?.source).toBe('default')
    })

    it('should report a rejected value as the default that is actually in effect', () => {
      const entries = describeOtelEntries({ OTEL_METRICS_PORT: 'nine-thousand' })

      // Echoing the typo back with `source: env` would claim the SDK picked it
      // up. The whole point of the view is showing that it did not.
      expect(entries.find(e => e.path === 'otel.metricsPort')).toMatchObject({
        source: 'default',
        value: String(DEFAULT_METRICS_PORT),
      })
    })

    it('should mark nothing secret — collector credentials are never read here', () => {
      const entries = describeOtelEntries({})

      expect(entries.some(e => e.secret)).toBe(false)
      expect(entries.every(e => e.value !== null)).toBe(true)
    })
  })
})
