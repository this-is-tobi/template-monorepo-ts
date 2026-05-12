import { describe, expect, it } from 'vitest'
import { apiPrefix } from '../api-client/utils.js'
import { auditRoutes } from './audit.js'

describe('routes/audit', () => {
  it('getAuditLogs has correct method and path', () => {
    expect(auditRoutes.getAuditLogs.method).toBe('GET')
    expect(auditRoutes.getAuditLogs.path).toBe(`${apiPrefix.v1}/audit`)
  })

  it('getAuditLogs has query and response schemas', () => {
    expect(auditRoutes.getAuditLogs.query).toBeDefined()
    expect(auditRoutes.getAuditLogs.responses[200]).toBeDefined()
  })

  it('getOrgAuditLogs has correct method and path', () => {
    expect(auditRoutes.getOrgAuditLogs.method).toBe('GET')
    expect(auditRoutes.getOrgAuditLogs.path).toBe(`${apiPrefix.v1}/organizations/:organizationId/audit`)
  })

  it('getOrgAuditLogs has params and query schemas', () => {
    expect(auditRoutes.getOrgAuditLogs.params).toBeDefined()
    expect(auditRoutes.getOrgAuditLogs.query).toBeDefined()
  })

  it('all routes are tagged Audit', () => {
    for (const route of Object.values(auditRoutes)) {
      expect(route.tags).toContain('Audit')
    }
  })
})
