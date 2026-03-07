import { KC_BUILTIN_ROLES, mapKeycloakProfileToUser } from './keycloak.js'

describe('keycloak', () => {
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
})
