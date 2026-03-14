import { context, trace } from '@opentelemetry/api'
import { otelMixin } from './otel.js'

describe('otelMixin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return an empty object when no active span exists', () => {
    const result = otelMixin()
    expect(result).toEqual({})
  })

  it('should return traceId and spanId when an active span exists', () => {
    vi.spyOn(trace, 'getSpan').mockReturnValueOnce({
      spanContext: () => ({ traceId: 'abc123', spanId: 'def456', traceFlags: 1 }),
    } as ReturnType<typeof trace.getSpan>)

    const result = otelMixin()
    expect(result).toEqual({ traceId: 'abc123', spanId: 'def456' })
  })

  it('should read the active context', () => {
    const spyGetSpan = vi.spyOn(trace, 'getSpan').mockReturnValueOnce(undefined)
    const spyActive = vi.spyOn(context, 'active')

    otelMixin()

    expect(spyActive).toHaveBeenCalledOnce()
    expect(spyGetSpan).toHaveBeenCalledWith(spyActive.mock.results[0]?.value)
  })
})
