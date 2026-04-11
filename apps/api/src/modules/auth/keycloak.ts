import { createLogger } from '@template-monorepo-ts/logger'

const keycloakLog = createLogger({ name: 'keycloak' })

/**
 * Keycloak built-in realm roles to ignore when mapping OIDC claims.
 * These are always present and have no meaning in the app's role system.
 */
export const KC_BUILTIN_ROLES = new Set(['offline_access', 'uma_authorization'])

/**
 * Fetch user info from Keycloak's OIDC userinfo endpoint.
 *
 * Uses the internal (server-reachable) issuer URL, not the public one.
 * Returns the raw profile claims so that `mapProfileToUser` can extract
 * realm_roles, groups, given_name, family_name, etc.
 */
export async function fetchKeycloakUserInfo(
  issuerUrl: string,
  accessToken: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${issuerUrl}/protocol/openid-connect/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<Record<string, unknown>>
}

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

// ---------------------------------------------------------------------------
// OIDC → Organization membership mapping
// ---------------------------------------------------------------------------

export interface OrgMembership {
  orgSlug: string
  role: string
}

export interface MapOrgMembershipsOptions {
  /** When true, parse realm_roles for org-scoped roles (e.g. "org-admin:slug"). */
  mapOrgRoles: boolean
  /** Prefix that identifies org-scoped realm roles. */
  orgRolePrefix: string
  /** Default org role when a group path has no role segment. */
  defaultOrgRole: string
}

/**
 * Extract organisation memberships from Keycloak OIDC claims.
 *
 * Two sources:
 *
 * 1. **Realm roles** (when `mapOrgRoles` is true):
 *    Pattern: `<orgRolePrefix><role>:<orgSlug>`
 *    Example: `org-admin:engineering` → `{ orgSlug: "engineering", role: "admin" }`
 *
 * 2. **Groups** (always processed when present):
 *    Pattern: `/<orgSlug>` or `/<orgSlug>/<role>`
 *    Example: `/engineering` → `{ orgSlug: "engineering", role: "member" }`
 *    Example: `/engineering/admin` → `{ orgSlug: "engineering", role: "admin" }`
 *
 * Results are deduplicated by orgSlug — when the same org appears in both
 * sources, the realm_role mapping wins (processed first).
 */
export function mapKeycloakToOrgMemberships(
  profile: Record<string, unknown>,
  options: MapOrgMembershipsOptions,
): OrgMembership[] {
  const seen = new Map<string, OrgMembership>()

  // 1. Realm roles → org memberships
  if (options.mapOrgRoles) {
    const realmRoles = (profile.realm_roles ?? []) as string[]
    for (const role of realmRoles) {
      if (!role.startsWith(options.orgRolePrefix)) continue
      const rest = role.slice(options.orgRolePrefix.length)
      const colonIdx = rest.indexOf(':')
      if (colonIdx < 1) continue
      const orgRole = rest.slice(0, colonIdx)
      const orgSlug = rest.slice(colonIdx + 1)
      if (!orgRole || !orgSlug) continue
      if (!seen.has(orgSlug)) {
        seen.set(orgSlug, { orgSlug, role: orgRole })
      }
    }
  }

  // 2. Groups → org memberships
  const groups = (profile.groups ?? []) as string[]
  for (const group of groups) {
    const parts = group.split('/').filter(Boolean)
    if (parts.length < 1) continue
    const orgSlug = parts[0]!
    const role = parts[1] ?? options.defaultOrgRole
    if (!seen.has(orgSlug)) {
      seen.set(orgSlug, { orgSlug, role })
    }
  }

  return [...seen.values()]
}

// ---------------------------------------------------------------------------
// Org membership sync — reconcile OIDC-derived memberships with BetterAuth
// ---------------------------------------------------------------------------

/**
 * Dependencies injected into `syncOrgMemberships` for testability.
 */
export interface SyncOrgDeps {
  findOrgBySlug: (slug: string) => Promise<{ id: string } | null>
  findMember: (userId: string, organizationId: string) => Promise<{ id: string, role: string } | null>
  addMember: (userId: string, organizationId: string, role: string) => Promise<void>
  updateMemberRole: (memberId: string, organizationId: string, role: string) => Promise<void>
}

/**
 * Reconcile OIDC-derived org memberships with the database.
 *
 * For each membership:
 * - If the org doesn't exist → skip (orgs must be pre-created)
 * - If the user is not a member → add them with the specified role
 * - If the user is already a member but with a different role → update the role
 * - If the user is already a member with the correct role → no-op
 *
 * Errors on individual memberships are caught and logged — one failure
 * does not block the remaining syncs.
 */
export async function syncOrgMemberships(
  userId: string,
  memberships: OrgMembership[],
  deps: SyncOrgDeps,
): Promise<void> {
  for (const { orgSlug, role } of memberships) {
    try {
      const org = await deps.findOrgBySlug(orgSlug)
      if (!org) continue

      const existing = await deps.findMember(userId, org.id)
      if (!existing) {
        await deps.addMember(userId, org.id, role)
      } else if (existing.role !== role) {
        await deps.updateMemberRole(existing.id, org.id, role)
      }
    } catch (err) {
      keycloakLog.error({ err, orgSlug }, 'failed to sync org membership')
    }
  }
}
