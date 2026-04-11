import type { SyncOrgDeps } from './keycloak.js'
import { fetchKeycloakUserInfo, KC_BUILTIN_ROLES, mapKeycloakProfileToUser, mapKeycloakToOrgMemberships, syncOrgMemberships } from './keycloak.js'

const { mockLogError } = vi.hoisted(() => ({ mockLogError: vi.fn() }))
vi.mock('@template-monorepo-ts/logger', () => ({
  createLogger: () => ({ error: mockLogError }),
}))

describe('keycloak', () => {
  describe('fetchKeycloakUserInfo', () => {
    it('returns the parsed profile on a successful response', async () => {
      const profile = { sub: 'u1', name: 'John', email: 'john@test.com' }
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(profile), { status: 200 }),
      )

      const result = await fetchKeycloakUserInfo('http://kc:8080/realms/test', 'tok')
      expect(result).toStrictEqual(profile)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://kc:8080/realms/test/protocol/openid-connect/userinfo',
        { headers: { Authorization: 'Bearer tok' } },
      )
      vi.restoreAllMocks()
    })

    it('returns null when the response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      )

      const result = await fetchKeycloakUserInfo('http://kc:8080/realms/test', 'bad')
      expect(result).toBeNull()
      vi.restoreAllMocks()
    })
  })

  describe('kC_BUILTIN_ROLES', () => {
    it('contains the standard built-in Keycloak realm roles', () => {
      expect(KC_BUILTIN_ROLES.has('offline_access')).toBe(true)
      expect(KC_BUILTIN_ROLES.has('uma_authorization')).toBe(true)
    })
  })

  describe('mapKeycloakProfileToUser', () => {
    it('maps given_name and family_name to firstname/lastname', () => {
      const result = mapKeycloakProfileToUser(
        { given_name: 'John', family_name: 'Doe' },
        { mapRoles: false, mapGroups: false },
      )
      expect(result.firstname).toBe('John')
      expect(result.lastname).toBe('Doe')
    })

    it('defaults to empty string when name fields are missing', () => {
      const result = mapKeycloakProfileToUser({}, { mapRoles: false, mapGroups: false })
      expect(result.firstname).toBe('')
      expect(result.lastname).toBe('')
    })

    it('does not set role when mapRoles and mapGroups are both false', () => {
      const result = mapKeycloakProfileToUser(
        { realm_roles: ['admin'], groups: ['/my-group'] },
        { mapRoles: false, mapGroups: false },
      )
      expect(result.role).toBeUndefined()
    })

    describe('mapRoles', () => {
      it('adds realm roles to the user when mapRoles is true', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: ['admin', 'editor'] },
          { mapRoles: true, mapGroups: false },
        )
        expect(result.role).toBe('admin,editor')
      })

      it('filters out KC_BUILTIN_ROLES (offline_access, uma_authorization)', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: ['offline_access', 'uma_authorization', 'custom-role'] },
          { mapRoles: true, mapGroups: false },
        )
        expect(result.role).toBe('custom-role')
      })

      it('filters out default-roles-* prefixed roles', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: ['default-roles-myrealm', 'default-roles-dev', 'admin'] },
          { mapRoles: true, mapGroups: false },
        )
        expect(result.role).toBe('admin')
      })

      it('does not set role when all realm roles are filtered out', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: ['offline_access', 'default-roles-realm'] },
          { mapRoles: true, mapGroups: false },
        )
        expect(result.role).toBeUndefined()
      })

      it('handles missing realm_roles claim gracefully', () => {
        const result = mapKeycloakProfileToUser({}, { mapRoles: true, mapGroups: false })
        expect(result.role).toBeUndefined()
      })

      it('handles empty realm_roles array', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: [] },
          { mapRoles: true, mapGroups: false },
        )
        expect(result.role).toBeUndefined()
      })
    })

    describe('mapGroups', () => {
      it('adds groups as roles, stripping the leading slash', () => {
        const result = mapKeycloakProfileToUser(
          { groups: ['/my-group', '/another-group'] },
          { mapRoles: false, mapGroups: true },
        )
        expect(result.role).toBe('my-group,another-group')
      })

      it('handles groups without leading slash', () => {
        const result = mapKeycloakProfileToUser(
          { groups: ['no-slash-group'] },
          { mapRoles: false, mapGroups: true },
        )
        expect(result.role).toBe('no-slash-group')
      })

      it('filters out empty strings after stripping slash (bare "/" entries)', () => {
        const result = mapKeycloakProfileToUser(
          { groups: ['/', ''] },
          { mapRoles: false, mapGroups: true },
        )
        expect(result.role).toBeUndefined()
      })

      it('handles missing groups claim gracefully', () => {
        const result = mapKeycloakProfileToUser({}, { mapRoles: false, mapGroups: true })
        expect(result.role).toBeUndefined()
      })
    })

    describe('mapRoles + mapGroups combined', () => {
      it('merges roles from realm_roles and groups, deduplicating', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: ['admin', 'editor'], groups: ['/admin', '/viewer'] },
          { mapRoles: true, mapGroups: true },
        )
        // 'admin' appears in both — should appear once
        expect(result.role).toBe('admin,editor,viewer')
      })

      it('does not set role when both sources produce no usable roles', () => {
        const result = mapKeycloakProfileToUser(
          { realm_roles: ['offline_access'], groups: ['/'] },
          { mapRoles: true, mapGroups: true },
        )
        expect(result.role).toBeUndefined()
      })
    })
  })

  describe('mapKeycloakToOrgMemberships', () => {
    const defaultOpts = { mapOrgRoles: false, orgRolePrefix: 'org-', defaultOrgRole: 'member' }

    describe('realm_roles → org memberships', () => {
      it('extracts org memberships from prefixed realm roles', () => {
        const result = mapKeycloakToOrgMemberships(
          { realm_roles: ['org-admin:engineering', 'org-member:sales'] },
          { ...defaultOpts, mapOrgRoles: true },
        )
        expect(result).toEqual([
          { orgSlug: 'engineering', role: 'admin' },
          { orgSlug: 'sales', role: 'member' },
        ])
      })

      it('ignores non-prefixed realm roles', () => {
        const result = mapKeycloakToOrgMemberships(
          { realm_roles: ['admin', 'org-owner:team1'] },
          { ...defaultOpts, mapOrgRoles: true },
        )
        expect(result).toEqual([{ orgSlug: 'team1', role: 'owner' }])
      })

      it('ignores roles without colon separator', () => {
        const result = mapKeycloakToOrgMemberships(
          { realm_roles: ['org-admin', 'org-:slug'] },
          { ...defaultOpts, mapOrgRoles: true },
        )
        expect(result).toEqual([])
      })

      it('skips realm role parsing when mapOrgRoles is false', () => {
        const result = mapKeycloakToOrgMemberships(
          { realm_roles: ['org-admin:engineering'] },
          defaultOpts,
        )
        expect(result).toEqual([])
      })

      it('uses custom orgRolePrefix', () => {
        const result = mapKeycloakToOrgMemberships(
          { realm_roles: ['team-admin:eng'] },
          { ...defaultOpts, mapOrgRoles: true, orgRolePrefix: 'team-' },
        )
        expect(result).toEqual([{ orgSlug: 'eng', role: 'admin' }])
      })
    })

    describe('groups → org memberships', () => {
      it('maps single-level groups to memberships with default role', () => {
        const result = mapKeycloakToOrgMemberships(
          { groups: ['/engineering', '/sales'] },
          defaultOpts,
        )
        expect(result).toEqual([
          { orgSlug: 'engineering', role: 'member' },
          { orgSlug: 'sales', role: 'member' },
        ])
      })

      it('maps two-level groups to memberships with specified role', () => {
        const result = mapKeycloakToOrgMemberships(
          { groups: ['/engineering/admin', '/sales/owner'] },
          defaultOpts,
        )
        expect(result).toEqual([
          { orgSlug: 'engineering', role: 'admin' },
          { orgSlug: 'sales', role: 'owner' },
        ])
      })

      it('uses custom defaultOrgRole', () => {
        const result = mapKeycloakToOrgMemberships(
          { groups: ['/team1'] },
          { ...defaultOpts, defaultOrgRole: 'viewer' },
        )
        expect(result).toEqual([{ orgSlug: 'team1', role: 'viewer' }])
      })

      it('skips empty groups', () => {
        const result = mapKeycloakToOrgMemberships(
          { groups: ['/', ''] },
          defaultOpts,
        )
        expect(result).toEqual([])
      })

      it('handles missing groups claim', () => {
        const result = mapKeycloakToOrgMemberships({}, defaultOpts)
        expect(result).toEqual([])
      })
    })

    describe('deduplication', () => {
      it('realm_roles win over groups for same org slug', () => {
        const result = mapKeycloakToOrgMemberships(
          { realm_roles: ['org-admin:engineering'], groups: ['/engineering/member'] },
          { ...defaultOpts, mapOrgRoles: true },
        )
        expect(result).toEqual([{ orgSlug: 'engineering', role: 'admin' }])
      })

      it('first group wins when same slug appears twice', () => {
        const result = mapKeycloakToOrgMemberships(
          { groups: ['/engineering/admin', '/engineering/member'] },
          defaultOpts,
        )
        expect(result).toEqual([{ orgSlug: 'engineering', role: 'admin' }])
      })
    })
  })

  describe('syncOrgMemberships', () => {
    function createMockDeps(): SyncOrgDeps & { calls: string[] } {
      const calls: string[] = []
      return {
        calls,
        findOrgBySlug: vi.fn(async (slug) => {
          calls.push(`findOrg:${slug}`)
          if (slug === 'unknown') return null
          return { id: `org-${slug}` }
        }),
        findMember: vi.fn(async (_uid, _orgId) => {
          calls.push(`findMember:${_orgId}`)
          return null
        }),
        addMember: vi.fn(async (_uid, _orgId, _role) => {
          calls.push(`addMember:${_orgId}:${_role}`)
        }),
        updateMemberRole: vi.fn(async (_mid, _orgId, _role) => {
          calls.push(`updateRole:${_mid}:${_role}`)
        }),
      }
    }

    it('adds members to existing orgs', async () => {
      const deps = createMockDeps()
      await syncOrgMemberships('u1', [
        { orgSlug: 'engineering', role: 'admin' },
        { orgSlug: 'sales', role: 'member' },
      ], deps)

      expect(deps.addMember).toHaveBeenCalledWith('u1', 'org-engineering', 'admin')
      expect(deps.addMember).toHaveBeenCalledWith('u1', 'org-sales', 'member')
    })

    it('skips orgs that do not exist', async () => {
      const deps = createMockDeps()
      await syncOrgMemberships('u1', [{ orgSlug: 'unknown', role: 'admin' }], deps)

      expect(deps.addMember).not.toHaveBeenCalled()
      expect(deps.updateMemberRole).not.toHaveBeenCalled()
    })

    it('updates role when member exists with different role', async () => {
      const deps = createMockDeps()
      vi.mocked(deps.findMember).mockResolvedValueOnce({ id: 'member-1', role: 'member' })

      await syncOrgMemberships('u1', [{ orgSlug: 'engineering', role: 'admin' }], deps)

      expect(deps.updateMemberRole).toHaveBeenCalledWith('member-1', 'org-engineering', 'admin')
      expect(deps.addMember).not.toHaveBeenCalled()
    })

    it('does nothing when member already has the correct role', async () => {
      const deps = createMockDeps()
      vi.mocked(deps.findMember).mockResolvedValueOnce({ id: 'member-1', role: 'admin' })

      await syncOrgMemberships('u1', [{ orgSlug: 'engineering', role: 'admin' }], deps)

      expect(deps.addMember).not.toHaveBeenCalled()
      expect(deps.updateMemberRole).not.toHaveBeenCalled()
    })

    it('continues processing after an error on one membership', async () => {
      const deps = createMockDeps()
      vi.mocked(deps.findOrgBySlug)
        .mockRejectedValueOnce(new Error('db error'))
        .mockResolvedValueOnce({ id: 'org-sales' })

      await syncOrgMemberships('u1', [
        { orgSlug: 'engineering', role: 'admin' },
        { orgSlug: 'sales', role: 'member' },
      ], deps)

      expect(mockLogError).toHaveBeenCalledOnce()
      expect(deps.addMember).toHaveBeenCalledWith('u1', 'org-sales', 'member')
    })
  })
})
