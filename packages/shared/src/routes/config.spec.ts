import { describe, expect, it } from 'vitest'
import { apiPrefix } from '../api-client/utils.js'
import { configRoutes } from './config.js'

describe('routes/config', () => {
  it('getConfig has correct method and path', () => {
    expect(configRoutes.getConfig.method).toBe('GET')
    expect(configRoutes.getConfig.path).toBe(`${apiPrefix.v1}/config`)
  })

  it('getConfig has response schema', () => {
    expect(configRoutes.getConfig.responses[200]).toBeDefined()
  })

  it('updateConfig has correct method and path', () => {
    expect(configRoutes.updateConfig.method).toBe('PUT')
    expect(configRoutes.updateConfig.path).toBe(`${apiPrefix.v1}/config`)
  })

  it('updateConfig has body schema', () => {
    expect(configRoutes.updateConfig.body).toBeDefined()
  })

  it('all routes are tagged Config', () => {
    for (const route of Object.values(configRoutes)) {
      expect(route.tags).toContain('Config')
    }
  })
})
