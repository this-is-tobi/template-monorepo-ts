import { ac, adminRole, memberRole, ownerRole } from './access-control.js'

describe('modules/auth - access control', () => {
  it('should export a valid access control instance', () => {
    expect(ac).toBeDefined()
    expect(typeof ac.newRole).toBe('function')
  })

  describe('ownerRole', () => {
    it('should have full permissions on all resources', () => {
      expect(ownerRole).toBeDefined()
      // Owner can do everything — including destructive org actions
      expect(ownerRole.authorize({ organization: ['update', 'delete'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ member: ['create', 'update', 'delete'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ invitation: ['create', 'cancel'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ project: ['create', 'read', 'update', 'delete'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ config: ['read', 'update'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ theme: ['read', 'update'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ audit: ['read'] })).toEqual({ success: true })
    })
  })

  describe('adminRole', () => {
    it('should manage members, invitations and projects', () => {
      expect(adminRole).toBeDefined()
      expect(adminRole.authorize({ member: ['create', 'update', 'delete'] })).toEqual({ success: true })
      expect(adminRole.authorize({ invitation: ['create', 'cancel'] })).toEqual({ success: true })
      expect(adminRole.authorize({ project: ['create', 'read', 'update', 'delete'] })).toEqual({ success: true })
      expect(adminRole.authorize({ audit: ['read'] })).toEqual({ success: true })
    })

    it('should not be able to delete org or manage roles', () => {
      expect(adminRole.authorize({ organization: ['delete'] }).success).toBe(false)
      expect(adminRole.authorize({ ac: ['create', 'update', 'delete'] }).success).toBe(false)
    })

    it('should read but not update config/theme', () => {
      expect(adminRole.authorize({ config: ['read'] })).toEqual({ success: true })
      expect(adminRole.authorize({ theme: ['read'] })).toEqual({ success: true })
      expect(adminRole.authorize({ config: ['update'] }).success).toBe(false)
      expect(adminRole.authorize({ theme: ['update'] }).success).toBe(false)
    })
  })

  describe('memberRole', () => {
    it('should only read projects', () => {
      expect(memberRole).toBeDefined()
      expect(memberRole.authorize({ project: ['read'] })).toEqual({ success: true })
    })

    it('should not create, update or delete projects', () => {
      expect(memberRole.authorize({ project: ['create'] }).success).toBe(false)
      expect(memberRole.authorize({ project: ['update'] }).success).toBe(false)
      expect(memberRole.authorize({ project: ['delete'] }).success).toBe(false)
    })

    it('should not access org management resources', () => {
      // Type-cast needed because BetterAuth's authorize() only accepts
      // the resources declared on the role — which is exactly the
      // guarantee we want to also verify at runtime.
      const authorize = memberRole.authorize.bind(memberRole) as (perms: Record<string, string[]>) => { success: boolean }
      expect(authorize({ organization: ['update'] }).success).toBe(false)
      expect(authorize({ member: ['create'] }).success).toBe(false)
      expect(authorize({ audit: ['read'] }).success).toBe(false)
    })
  })
})
