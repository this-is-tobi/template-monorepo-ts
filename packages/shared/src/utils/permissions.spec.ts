import { describe, expect, it } from 'vitest'
import {
  describePermission,
  forbiddenServiceKeyGrants,
  isForbiddenServiceKeyGrant,
  ORGANIZATION_ROLES,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_MATRIX,
  PROJECT_ROLE_NAMES,
  PROJECT_ROLES,
  roleGrantList,
  roleGrants,
} from './permissions.js'

describe('[Shared] - Permissions', () => {
  describe('role tables', () => {
    it('should only grant actions the permission matrix defines', () => {
      // A role granting something outside the vocabulary would be silently
      // unenforceable: `authorize` has no statement to match it against.
      for (const [label, table] of [['project', PROJECT_ROLES], ['organization', ORGANIZATION_ROLES]] as const) {
        for (const [role, definition] of Object.entries(table)) {
          for (const [resource, actions] of Object.entries(definition.permissions)) {
            const known = PERMISSION_MATRIX[resource as keyof typeof PERMISSION_MATRIX] as readonly string[] | undefined
            expect(known, `${label} ${role} names unknown resource ${resource}`).toBeDefined()
            for (const action of actions) {
              expect(known, `${label} ${role}: ${resource}:${action}`).toContain(action)
            }
          }
        }
      }
    })

    it('should list project roles strongest first, so a picker reads top-down', () => {
      expect(PROJECT_ROLE_NAMES).toEqual(['owner', 'admin', 'member', 'viewer'])
    })

    it('should keep each project role a subset of the one above it', () => {
      // The four roles are meant to be a ladder. If they ever stop nesting,
      // "promote to admin" could quietly take a permission away.
      const ladder = PROJECT_ROLE_NAMES.map(role => new Set(roleGrantList(role)))
      for (let i = 1; i < ladder.length; i++) {
        for (const grant of ladder[i]!) {
          expect([...ladder[i - 1]!], `${PROJECT_ROLE_NAMES[i]} ⊄ ${PROJECT_ROLE_NAMES[i - 1]}`).toContain(grant)
        }
      }
    })

    it('should give an organization member nothing by default', () => {
      expect(ORGANIZATION_ROLES.member.permissions).toEqual({})
    })
  })

  describe('permission descriptions', () => {
    it('should explain every action the vocabulary defines', () => {
      // A picker that shows `ac:create` and nothing else asks the person
      // granting access to already know what it means.
      for (const [resource, actions] of Object.entries(PERMISSION_MATRIX)) {
        for (const action of actions) {
          expect(
            describePermission(resource, action),
            `${resource}:${action} has no description`,
          ).toBeTruthy()
        }
      }
    })

    it('should not describe anything the vocabulary does not define', () => {
      // A stale entry is a description nobody will ever see, and a hint that
      // an action was renamed without updating its words.
      const known = new Set(
        Object.entries(PERMISSION_MATRIX)
          .flatMap(([resource, actions]) => actions.map(action => `${resource}:${action}`)),
      )
      for (const key of Object.keys(PERMISSION_DESCRIPTIONS)) {
        expect([...known], `${key} describes an action that no longer exists`).toContain(key)
      }
    })

    it('should say what the permission does rather than restate its name', () => {
      for (const [key, text] of Object.entries(PERMISSION_DESCRIPTIONS)) {
        expect(text.length, `${key} is too terse to help`).toBeGreaterThan(20)
        expect(text.endsWith('.'), `${key} should read as a sentence`).toBe(true)
      }
    })

    it('should be undefined for an action it has never heard of', () => {
      expect(describePermission('project', 'teleport')).toBeUndefined()
    })
  })

  describe('roleGrants', () => {
    it('should answer the question a button needs to ask', () => {
      expect(roleGrants('admin', 'project', 'manage-members')).toBe(true)
      expect(roleGrants('member', 'project', 'manage-members')).toBe(false)
    })

    it('should be false for a role it has never heard of', () => {
      // Unknown roles come from the database, so this must not throw.
      expect(roleGrants('', 'project', 'read')).toBe(false)
      expect(roleGrants('wizard', 'project', 'read')).toBe(false)
    })

    it('should read the organization table when given it', () => {
      expect(roleGrants('owner', 'organization', 'delete', ORGANIZATION_ROLES)).toBe(true)
      expect(roleGrants('admin', 'organization', 'delete', ORGANIZATION_ROLES)).toBe(false)
    })
  })

  describe('roleGrantList', () => {
    it('should flatten a role to resource:action strings', () => {
      expect(roleGrantList('viewer')).toEqual(['project:read'])
    })

    it('should be empty for an unknown role rather than throwing', () => {
      expect(roleGrantList('wizard')).toEqual([])
    })
  })

  describe('service key restrictions', () => {
    it('should refuse the grants that would let a key outlive its revocation', () => {
      expect(isForbiddenServiceKeyGrant('service-key', 'create')).toBe(true)
      expect(isForbiddenServiceKeyGrant('project', 'manage-members')).toBe(true)
    })

    it('should leave ordinary grants alone', () => {
      expect(isForbiddenServiceKeyGrant('project', 'read')).toBe(false)
      expect(isForbiddenServiceKeyGrant('audit', 'read')).toBe(false)
    })

    it('should report every offending grant, not just the first', () => {
      expect(forbiddenServiceKeyGrants({
        project: ['read', 'manage-members'],
        'service-key': ['create'],
      })).toEqual(['project:manage-members', 'service-key:create'])
    })

    it('should catch a wildcard that covers a forbidden action without naming it', () => {
      expect(forbiddenServiceKeyGrants({ project: ['*'] })).toEqual(['project:*'])
    })

    it('should pass a clean permission set', () => {
      expect(forbiddenServiceKeyGrants({ project: ['read', 'update'] })).toEqual([])
      expect(forbiddenServiceKeyGrants({})).toEqual([])
    })
  })
})
