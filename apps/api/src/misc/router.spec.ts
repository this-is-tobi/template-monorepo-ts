import { describe, it, expect } from 'vitest'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '@/app.js'
import { config } from '@/utils/index.js'

describe('System - router', () => {
  it('Should send application version', async () => {
    const response = await app.inject()
      .get(apiPrefix + '/version')
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ version: config.api.version })
  })

  it('Should send application health with status OK', async () => {
    const response = await app.inject()
      .get(apiPrefix + '/healthz')
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })
})
