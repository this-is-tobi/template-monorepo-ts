import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { getRedisClient } from '~/modules/auth/redis.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { APP_VERSION, config } from '~/utils/index.js'

vi.mock('~/modules/auth/redis.js', () => ({
  getRedisClient: vi.fn().mockReturnValue(undefined),
}))

const originalOidc = { ...config.oidc }
const originalFetch = globalThis.fetch

afterEach(() => {
  Object.assign(config.oidc, originalOidc)
  globalThis.fetch = originalFetch
  vi.mocked(getRedisClient).mockReturnValue(undefined)
})

describe('[System] - router', () => {
  it('should send application version', async () => {
    const response = await app.inject()
      .get(`${apiPrefix.v1}/version`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ version: APP_VERSION })
  })

  it('should send application health with status OK', async () => {
    const response = await app.inject()
      .get(`${apiPrefix.v1}/healthz`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })

  it('should send readiness OK with component statuses when all healthy', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('OK')
    expect(body.components.database).toStrictEqual({ status: 'ok' })
    expect(body.components.redis).toStrictEqual({ status: 'ok', message: 'Not configured (using DB sessions)' })
    expect(body.components.keycloak).toStrictEqual({ status: 'ok', message: 'Not enabled' })
    expect(db.$queryRaw).toHaveBeenCalled()
  })

  it('should send readiness KO when database is unreachable', async () => {
    db.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'))

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(503)
    const body = response.json()
    expect(body.status).toBe('KO')
    expect(body.components.database).toStrictEqual({ status: 'unavailable', message: 'Database is not reachable' })
  })

  it('should report Redis ok when the client pings successfully', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
    vi.mocked(getRedisClient).mockReturnValue({ ping: vi.fn().mockResolvedValue('PONG') } as never)

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json().components.redis).toStrictEqual({ status: 'ok' })
  })

  it('should report Redis unavailable when ping fails', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
    vi.mocked(getRedisClient).mockReturnValue({ ping: vi.fn().mockRejectedValue(new Error('boom')) } as never)

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(503)
    expect(response.json().components.redis).toStrictEqual({ status: 'unavailable', message: 'Redis is not reachable' })
  })

  it('should report Keycloak ok when the discovery endpoint returns 200', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
    config.oidc.enabled = true
    config.oidc.issuer = 'https://kc.example.com/realms/test/'
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json().components.keycloak).toStrictEqual({ status: 'ok' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://kc.example.com/realms/test/.well-known/openid-configuration',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('should report Keycloak unavailable on non-2xx status', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
    config.oidc.enabled = true
    config.oidc.issuer = 'https://kc.example.com/realms/test'
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(503)
    expect(response.json().components.keycloak).toStrictEqual({ status: 'unavailable', message: 'Keycloak responded with 500' })
  })

  it('should report Keycloak unavailable on network error', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
    config.oidc.enabled = true
    config.oidc.issuer = 'https://kc.example.com/realms/test'
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(503)
    expect(response.json().components.keycloak).toStrictEqual({ status: 'unavailable', message: 'Keycloak is not reachable' })
  })

  it('should send liveness OK', async () => {
    const response = await app.inject()
      .get(`${apiPrefix.v1}/livez`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })
})
