import { apiPrefix } from '@template-monorepo-ts/shared'
import app, { UNMATCHED_ROUTE } from '~/app.js'
import { httpRequestDuration } from '~/utils/otel.js'

/** The `http.route` label of the most recent recorded observation. */
function lastRecordedRoute(record: ReturnType<typeof vi.spyOn>): unknown {
  const call = record.mock.calls.at(-1)
  return (call?.[1] as Record<string, unknown> | undefined)?.['http.route']
}

describe('[App] - request duration metric', () => {
  let record: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    record = vi.spyOn(httpRequestDuration, 'record')
  })

  afterEach(() => {
    record.mockRestore()
  })

  it('should label a matched request with its route pattern', async () => {
    await app.inject().get(`${apiPrefix.v1}/version`).end()

    expect(record).toHaveBeenCalled()
    expect(lastRecordedRoute(record)).toEqual(expect.stringContaining('/version'))
  })

  // Regression: `routeOptions.url` is undefined for every unmatched path, and
  // the fallback was `request.url` — the raw, attacker-chosen request target.
  // Each distinct 404 therefore became a new label value in a cumulative
  // histogram, so walking random paths grew the process's series set and the
  // /metrics payload without bound.
  it('should label an unmatched path with a single sentinel, not the raw URL', async () => {
    await app.inject().get('/no-such-path-a1b2c3?cachebust=zzz').end()

    expect(record).toHaveBeenCalled()
    expect(lastRecordedRoute(record)).toBe(UNMATCHED_ROUTE)
  })

  it('should not let distinct unmatched paths create distinct label values', async () => {
    await app.inject().get('/nope-one').end()
    await app.inject().get('/nope-two').end()
    await app.inject().get('/nope-three').end()

    const routes = record.mock.calls.map(call => (call[1] as Record<string, unknown>)['http.route'])
    expect(new Set(routes)).toEqual(new Set([UNMATCHED_ROUTE]))
  })

  it('should not record health checks at all', async () => {
    await app.inject().get(`${apiPrefix.v1}/healthz`).end()

    expect(record).not.toHaveBeenCalled()
  })
})
