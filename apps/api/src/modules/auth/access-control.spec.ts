import { readFileSync } from 'node:fs'
import path from 'node:path'
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
      expect(ownerRole.authorize({ project: ['create', 'read', 'update', 'delete', 'manage-members'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ config: ['read', 'update'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ theme: ['read', 'update'] })).toEqual({ success: true })
      expect(ownerRole.authorize({ audit: ['read'] })).toEqual({ success: true })
    })

    it('should cover every statement in the access control definition', () => {
      // Owner is defined as "all permissions" — assert it against the
      // statement set so a new resource cannot be silently left out.
      const statements = ac.statements as Record<string, readonly string[]>
      for (const [resource, actions] of Object.entries(statements)) {
        expect(ownerRole.authorize({ [resource]: [...actions] } as never)).toEqual({ success: true })
      }
    })
  })

  describe('adminRole', () => {
    it('should manage members, invitations and projects (incl. rosters)', () => {
      expect(adminRole).toBeDefined()
      expect(adminRole.authorize({ member: ['create', 'update', 'delete'] })).toEqual({ success: true })
      expect(adminRole.authorize({ invitation: ['create', 'cancel'] })).toEqual({ success: true })
      expect(adminRole.authorize({ project: ['create', 'read', 'update', 'delete', 'manage-members'] })).toEqual({ success: true })
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
    it('should have no default permissions', () => {
      expect(memberRole).toBeDefined()
      // Member role has no default permissions — users must be granted
      // access through project membership or custom org roles.
      const authorize = memberRole.authorize.bind(memberRole) as (perms: Record<string, string[]>) => { success: boolean }
      expect(authorize({ project: ['read'] }).success).toBe(false)
    })

    it('should not create, update or delete projects', () => {
      const authorize = memberRole.authorize.bind(memberRole) as (perms: Record<string, string[]>) => { success: boolean }
      expect(authorize({ project: ['create'] }).success).toBe(false)
      expect(authorize({ project: ['update'] }).success).toBe(false)
      expect(authorize({ project: ['delete'] }).success).toBe(false)
      expect(authorize({ project: ['manage-members'] }).success).toBe(false)
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

  describe('documentation drift', () => {
    it('should match the resource table in docs/10-permissions.md', () => {
      // The permissions doc previously drifted from the code (wrong
      // resource names, wrong action lists). Parse its "Resources and
      // actions" table and assert it against `ac.statements` so the two
      // cannot diverge again.
      const docPath = path.resolve(import.meta.dirname, '../../../../../docs/10-permissions.md')
      const doc = readFileSync(docPath, 'utf8')

      const section = doc.split('## Resources and actions')[1]?.split('\n## ')[0]
      expect(section, 'docs/10-permissions.md must contain a "Resources and actions" section').toBeDefined()

      // Rows look like: | `project` | `create`, `read`, ... | description |
      const documented: Record<string, string[]> = {}
      for (const line of section!.split('\n')) {
        const match = line.match(/^\|\s*`([\w-]+)`\s*\|([^|]+)\|/)
        if (!match) continue
        const actions = [...match[2]!.matchAll(/`([\w-]+)`/g)].map(m => m[1]!)
        documented[match[1]!] = actions
      }

      const statements = ac.statements as Record<string, readonly string[]>
      const codeResources: Record<string, string[]> = {}
      for (const [resource, actions] of Object.entries(statements)) {
        codeResources[resource] = [...actions].sort()
      }
      const docResources: Record<string, string[]> = {}
      for (const [resource, actions] of Object.entries(documented)) {
        docResources[resource] = [...actions].sort()
      }

      expect(docResources).toEqual(codeResources)
    })
  })
})
