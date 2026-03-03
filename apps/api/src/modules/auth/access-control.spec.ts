import { ac, adminRole, memberRole, ownerRole } from './access-control.js'

describe('modules/auth - access control', () => {
  it('should export a valid access control instance', () => {
    expect(ac).toBeDefined()
    expect(typeof ac.newRole).toBe('function')
  })

  it('should export ownerRole with full permissions', () => {
    expect(ownerRole).toBeDefined()
  })

  it('should export adminRole', () => {
    expect(adminRole).toBeDefined()
  })

  it('should export memberRole', () => {
    expect(memberRole).toBeDefined()
  })
})
