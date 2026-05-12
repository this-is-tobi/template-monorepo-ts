import { describe, expect, it } from 'vitest'
import { apiPrefix } from '../api-client/utils.js'
import { themeRoutes } from './theme.js'

describe('routes/theme', () => {
  it('getTheme has correct method and path', () => {
    expect(themeRoutes.getTheme.method).toBe('GET')
    expect(themeRoutes.getTheme.path).toBe(`${apiPrefix.v1}/theme`)
  })

  it('getTheme has response schema', () => {
    expect(themeRoutes.getTheme.responses[200]).toBeDefined()
  })

  it('updateTheme has correct method and path', () => {
    expect(themeRoutes.updateTheme.method).toBe('PUT')
    expect(themeRoutes.updateTheme.path).toBe(`${apiPrefix.v1}/theme`)
  })

  it('updateTheme has body schema', () => {
    expect(themeRoutes.updateTheme.body).toBeDefined()
  })

  it('all routes are tagged Theme', () => {
    for (const route of Object.values(themeRoutes)) {
      expect(route.tags).toContain('Theme')
    }
  })
})
