import { forbiddenServiceKeyGrants, unknownGrants } from '@template-monorepo-ts/shared'
import { callHasPermission, checkProjectRolePermission } from '~/modules/auth/permissions.js'

// ---------------------------------------------------------------------------
// The one gate every API-key grant has to pass.
//
// An API key's `permissions` column is AUTHORITATIVE at request time: when it
// is set, `requirePermission` grants on a match and returns, never falling
// through to the owner's org / project / ownership checks (permissions.ts,
// step 2). That is deliberate — the column is a *cap*, so a read-only key
// cannot borrow its owner's write access.
//
// The safety of that design rests entirely on the column never being allowed
// to exceed what the person writing it holds. There are three places that
// write it — key creation, `PUT /api-keys/:id`, and project service keys — and
// when each carried its own version of the rule, all three drifted apart:
// creation checked permissions but not the vocabulary, the update path checked
// only when `permissions` was in the body (so re-pointing a validated key at
// another organization skipped the check entirely), and service keys were
// never checked against their creator at all.
//
// So there is one function, and every write path calls it. A new write path
// that forgets is the only remaining way to reintroduce the bug, and that is a
// far more visible mistake than a subtly different copy of the rule.
// ---------------------------------------------------------------------------

/** Outcome of a grant validation, mirroring `validateApiKeyScope`. */
export type KeyGrantCheck = { valid: true } | { valid: false, reason: string }

export interface KeyGrantActor {
  userId: string
  /** Platform admins can already reach every endpoint. */
  isAdmin: boolean
  headers: Headers | Record<string, string>
  /**
   * The actor's role on the project a service key is being minted for.
   *
   * A project admin who is a plain organization member holds `project:read`
   * through their project role and nothing whatsoever through the org, so an
   * org-only check would refuse them a key they are plainly entitled to mint.
   */
  projectRole?: string
}

export interface KeyGrant {
  permissions: Record<string, string[]> | null | undefined
  /**
   * Organizations the key will be able to act in once the change lands.
   *
   * Every one must grant the permissions independently, otherwise a multi-org
   * key would carry, in org B, rights only held in org A.
   */
  organizationIds: string[]
  /** Service keys are held by a machine, and carry extra restrictions. */
  kind: 'user' | 'service'
}

/**
 * Does this permission set use a wildcard in either position?
 *
 * `{"*": [...]}` spans every resource and `{res: ["*"]}` every action, so both
 * grow silently as the permission matrix grows.
 */
export function hasWildcardPermission(permissions: Record<string, string[]>): boolean {
  return Object.entries(permissions).some(
    ([resource, actions]) => resource === '*' || actions.includes('*'),
  )
}

/**
 * Drop the grants the actor's project role already covers.
 *
 * Whatever is left still has to come from somewhere, so it falls through to
 * the organization check below.
 */
function withoutProjectRoleGrants(
  permissions: Record<string, string[]>,
  role: string,
): Record<string, string[]> {
  const remaining: Record<string, string[]> = {}
  for (const [resource, actions] of Object.entries(permissions)) {
    const uncovered = actions.filter(action => !checkProjectRolePermission(role, { [resource]: [action] }))
    if (uncovered.length > 0) remaining[resource] = uncovered
  }
  return remaining
}

/**
 * Refuse a grant the actor is not entitled to write.
 *
 * An empty or absent permission set is always allowed: it means "inherit the
 * owner", which re-resolves against live org and project membership on every
 * request and so can never outrun what the owner currently holds.
 */
export async function validateKeyGrant(
  actor: KeyGrantActor,
  grant: KeyGrant,
): Promise<KeyGrantCheck> {
  const { permissions } = grant
  if (!permissions || Object.keys(permissions).length === 0) return { valid: true }

  // ── 1. Stay inside the vocabulary ─────────────────────────────────────
  const unknown = unknownGrants(permissions)
  if (unknown.length > 0) {
    return { valid: false, reason: `Unknown permissions (${unknown.join(', ')})` }
  }

  const wildcard = hasWildcardPermission(permissions)

  // ── 2. A service key names its permissions explicitly ─────────────────
  // A wildcard cannot be reconciled with the ban list below — it grants the
  // banned pairs without ever naming them — so machine credentials do not get
  // one, platform admin or not.
  if (grant.kind === 'service') {
    if (wildcard) {
      return { valid: false, reason: 'A service key must name its permissions explicitly — wildcards are not allowed' }
    }
    const forbidden = forbiddenServiceKeyGrants(permissions)
    if (forbidden.length > 0) {
      return {
        valid: false,
        reason: `A service key cannot be granted permissions that mint further keys or manage members (${forbidden.join(', ')})`,
      }
    }
  }

  // ── 3. Platform admins may grant what they can already do ─────────────
  if (actor.isAdmin) return { valid: true }

  if (wildcard) {
    return { valid: false, reason: 'Wildcard permissions are restricted to platform administrators' }
  }

  // ── 4. A permissioned key is always pinned to an organization ─────────
  // Without this an unscoped key skips the scope check in `requirePermission`
  // altogether and its permissions apply in every tenant on the instance.
  if (grant.organizationIds.length === 0) {
    return { valid: false, reason: 'An active organization is required to create API keys with permissions' }
  }

  // ── 5. The actor must hold everything being granted ───────────────────
  const remaining = actor.projectRole
    ? withoutProjectRoleGrants(permissions, actor.projectRole)
    : permissions
  if (Object.keys(remaining).length === 0) return { valid: true }

  for (const organizationId of grant.organizationIds) {
    const result = await callHasPermission({
      headers: actor.headers,
      userId: actor.userId,
      organizationId,
      permissions: remaining,
    })
    if (!result?.success) {
      return { valid: false, reason: 'Requested permissions exceed your current role' }
    }
  }

  return { valid: true }
}
