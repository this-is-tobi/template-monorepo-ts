import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { config } from '~/utils/index.js'

describe('[System] - router', () => {
  it('should send application version', async () => {
    const response = await app.inject()
      .get(`${apiPrefix.v1}/version`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ version: config.api.version })
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

  it('should send liveness OK', async () => {
    const response = await app.inject()
      .get(`${apiPrefix.v1}/livez`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })
})
