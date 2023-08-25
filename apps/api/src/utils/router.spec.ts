import { describe, it, expect } from 'vitest'
import app from '../app.js'
import { appVersion, apiPrefix } from './index.js'

describe('Utils - router', () => {
  it('Should send application version', async () => {
    const response = await app.inject()
      .get(apiPrefix + '/version')
      .end()
    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ version: appVersion })
  })

  it('Should send application health with status OK', async () => {
    const response = await app.inject()
      .get(apiPrefix + '/healthz')
      .end()
    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })
})
