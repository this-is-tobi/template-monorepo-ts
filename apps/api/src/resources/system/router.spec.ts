import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '@/app.js'
import { config } from '@/utils/index.js'

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
})
