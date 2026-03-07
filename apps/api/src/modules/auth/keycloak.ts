/**
 * Keycloak built-in realm roles to ignore when mapping OIDC claims.
 * These are always present and have no meaning in the app's role system.
 */
export const KC_BUILTIN_ROLES = new Set(['offline_access', 'uma_authorization'])

/**
 * Map a Keycloak OIDC profile to BetterAuth user fields.
 *
 * When `mapRoles` is enabled, the user's realm roles (from the `realm_roles`
 * claim) are synced into BetterAuth, filtering out built-in Keycloak roles.
 * When `mapGroups` is enabled, the user's group memberships (from the
 * `groups` claim) are also added as roles, with leading '/' stripped.
 *
 * Both sources are merged and deduplicated into a single comma-separated
 * `role` field.  When neither option is enabled, the `role` field is omitted
 * entirely and BetterAuth applies `defaultRole` on first login.
 *
 * @param profile         - The OIDC profile claims received from Keycloak.
 * @param options         - Controlling which claims to map.
 * @param options.mapRoles  - When true, includes realm roles from Keycloak.
 * @param options.mapGroups - When true, includes groups from Keycloak.
 */
export function mapKeycloakProfileToUser(
  profile: Record<string, unknown>,
  options: { mapRoles: boolean, mapGroups: boolean },
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    firstname: (profile.given_name as string) ?? '',
    lastname: (profile.family_name as string) ?? '',
  }

  if (options.mapRoles || options.mapGroups) {
    const roles = new Set<string>()

    // Keycloak realm roles → BetterAuth roles
    if (options.mapRoles) {
      const realmRoles = (profile.realm_roles ?? []) as string[]
      for (const r of realmRoles) {
        if (!KC_BUILTIN_ROLES.has(r) && !r.startsWith('default-roles-')) {
          roles.add(r)
        }
      }
    }

    // Keycloak groups → BetterAuth roles (strip leading '/')
    if (options.mapGroups) {
      const groups = (profile.groups ?? []) as string[]
      const cleanGroups = groups.map(g => g.replace(/^\//, '')).filter(Boolean)
      for (const g of cleanGroups) {
        roles.add(g)
      }
    }

    if (roles.size > 0) {
      mapped.role = [...roles].join(',')
    }
  }

  return mapped
}
