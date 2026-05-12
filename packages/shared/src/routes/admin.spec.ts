import { describe, expect, it } from 'vitest'
import { apiPrefix } from '../api-client/utils.js'
import { adminRoutes } from './admin.js'

describe('routes/admin', () => {
  it('getAdminOrganizations has correct method and path', () => {
    expect(adminRoutes.getAdminOrganizations.method).toBe('GET')
    expect(adminRoutes.getAdminOrganizations.path).toBe(`${apiPrefix.v1}/admin/organizations`)
  })

  it('getAdminOrganizations has query and response schemas', () => {
    expect(adminRoutes.getAdminOrganizations.query).toBeDefined()
    expect(adminRoutes.getAdminOrganizations.responses[200]).toBeDefined()
  })

  it('getAdminOrganizationById has correct method and path', () => {
    expect(adminRoutes.getAdminOrganizationById.method).toBe('GET')
    expect(adminRoutes.getAdminOrganizationById.path).toBe(`${apiPrefix.v1}/admin/organizations/:id`)
  })

  it('getAdminOrganizationById has params schema', () => {
    expect(adminRoutes.getAdminOrganizationById.params).toBeDefined()
  })

  it('getAdminApiKeys has correct method and path', () => {
    expect(adminRoutes.getAdminApiKeys.method).toBe('GET')
    expect(adminRoutes.getAdminApiKeys.path).toBe(`${apiPrefix.v1}/admin/api-keys`)
  })

  it('getAdminApiKeyById has correct method and path', () => {
    expect(adminRoutes.getAdminApiKeyById.method).toBe('GET')
    expect(adminRoutes.getAdminApiKeyById.path).toBe(`${apiPrefix.v1}/admin/api-keys/:id`)
  })

  it('getAdminUserById has correct method and path', () => {
    expect(adminRoutes.getAdminUserById.method).toBe('GET')
    expect(adminRoutes.getAdminUserById.path).toBe(`${apiPrefix.v1}/admin/users/:id`)
  })

  it('all routes are tagged Admin', () => {
    for (const route of Object.values(adminRoutes)) {
      expect(route.tags).toContain('Admin')
    }
  })

  it('contains all expected route keys', () => {
    const keys = Object.keys(adminRoutes)
    expect(keys).toContain('getAdminOrganizations')
    expect(keys).toContain('getAdminOrganizationById')
    expect(keys).toContain('getAdminApiKeys')
    expect(keys).toContain('getAdminApiKeyById')
    expect(keys).toContain('getAdminUserById')
  })
})
