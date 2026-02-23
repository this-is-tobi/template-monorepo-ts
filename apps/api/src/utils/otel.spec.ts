import { fastifyOtelInstrumentation, httpRequestDuration, shutdownOtel } from '~/utils/otel.js'

describe('otel', () => {
  describe('fastifyOtelInstrumentation', () => {
    it('should export a FastifyOtelInstrumentation instance', () => {
      expect(fastifyOtelInstrumentation).toBeDefined()
      expect(typeof fastifyOtelInstrumentation.plugin).toBe('function')
    })
  })

  describe('httpRequestDuration', () => {
    it('should export a histogram', () => {
      expect(httpRequestDuration).toBeDefined()
      expect(typeof httpRequestDuration.record).toBe('function')
    })

    it('should safely record a value (noop in test env)', () => {
      expect(() => {
        httpRequestDuration.record(0.123, {
          'http.request.method': 'GET',
          'http.response.status_code': 200,
          'http.route': '/api/v1/test',
        })
      }).not.toThrow()
    })
  })

  describe('shutdownOtel', () => {
    it('should resolve without error when SDK is disabled', async () => {
      await expect(shutdownOtel()).resolves.toBeUndefined()
    })
  })
})
