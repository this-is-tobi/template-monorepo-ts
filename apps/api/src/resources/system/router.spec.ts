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

  it('should send readiness OK when database is reachable', async () => {
    db.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }])

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
    expect(db.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1')
  })

  it('should send readiness KO when database is unreachable', async () => {
    db.$queryRawUnsafe.mockRejectedValueOnce(new Error('Connection refused'))

    const response = await app.inject()
      .get(`${apiPrefix.v1}/readyz`)
      .end()

    expect(response.statusCode).toBe(503)
    expect(response.json()).toStrictEqual({ status: 'KO', message: 'Database is not reachable' })
  })

  it('should send liveness OK', async () => {
    const response = await app.inject()
      .get(`${apiPrefix.v1}/livez`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })
})
