import { describe, expect, it } from 'vitest'
import { apiPrefix } from '../api-client/utils.js'
import { apiKeyRoutes } from './apikeys.js'

describe('routes/apikeys', () => {
  it('updateApiKey has correct method and path', () => {
    expect(apiKeyRoutes.updateApiKey.method).toBe('PUT')
    expect(apiKeyRoutes.updateApiKey.path).toBe(`${apiPrefix.v1}/api-keys/:id`)
  })

  it('updateApiKey has params and body schemas', () => {
    expect(apiKeyRoutes.updateApiKey.params).toBeDefined()
    expect(apiKeyRoutes.updateApiKey.body).toBeDefined()
  })

  it('updateApiKey has response schema', () => {
    expect(apiKeyRoutes.updateApiKey.responses).toBeDefined()
  })

  it('updateApiKey is tagged API Keys', () => {
    expect(apiKeyRoutes.updateApiKey.tags).toContain('API Keys')
  })
})
