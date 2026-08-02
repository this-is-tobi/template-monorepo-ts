import { callHasPermission } from '~/modules/auth/permissions.js'

// ---------------------------------------------------------------------------
// API key permission validation — shared by creation and update.
//
// An API key's `permissions` column is AUTHORITATIVE at request time: when it
// is set, `requirePermission` grants on a match and never falls through to the
// owner's org / project / ownership checks (see permissions.ts, step 2). That
// is a deliberate design — the column is a *cap*, so a read-only key cannot
// borrow its owner's write access.
//
// The whole safety of that design rests on the column never being allowed to
// exceed what its owner can do, which makes validation at every write path
// mandatory rather than advisory. Creation used to be the only guarded path;
// `PUT /api-keys/:id` wrote the column straight through, so a key minted with
// no permissions could be widened to `{"*": ["*"]}` afterwards and then used
// to read and write projects in organizations the owner did not belong to.
// Hence one validator, called from both.
// ---------------------------------------------------------------------------

/** Outcome of a permission validation, mirroring `validateApiKeyScope`. */
export type ApiKeyPermissionCheck = { valid: true } | { valid: false, reason: string }

export interface ApiKeyPermissionContext {
  userId: string
  /** Platform admins are exempt — they can already reach every endpoint. */
  isAdmin: boolean
  /**
   * Organizations the key will be able to act in once the change lands.
   *
   * Every one of them must grant the requested permissions independently,
   * otherwise a multi-org key would carry, in org B, rights only held in org A.
   */
  organizationIds: string[]
  headers: Headers | Record<string, string>
}

/**
 * Does this permission set use a wildcard in either position?
 *
 * `{"*": [...]}` spans every resource and `{res: ["*"]}` every action, so both
 * grow silently as the permission matrix grows. Only platform admins may hold
 * one.
 */
export function hasWildcardPermission(permissions: Record<string, string[]>): boolean {
  return Object.entries(permissions).some(
    ([resource, actions]) => resource === '*' || actions.includes('*'),
  )
}

/**
 * Reject a permission set the caller does not itself hold.
 *
 * An empty or absent set is always allowed: it means "inherit the owner", which
 * re-evaluates against live org and project membership on every request and so
 * can never be an escalation.
 */
export async function validateApiKeyPermissions(
  permissions: Record<string, string[]> | null | undefined,
  ctx: ApiKeyPermissionContext,
): Promise<ApiKeyPermissionCheck> {
  if (!permissions || Object.keys(permissions).length === 0) return { valid: true }
  if (ctx.isAdmin) return { valid: true }

  if (hasWildcardPermission(permissions)) {
    return { valid: false, reason: 'Wildcard permissions are restricted to platform administrators' }
  }

  if (ctx.organizationIds.length === 0) {
    return { valid: false, reason: 'An active organization is required to create API keys with permissions' }
  }

  for (const organizationId of ctx.organizationIds) {
    const result = await callHasPermission({
      headers: ctx.headers,
      userId: ctx.userId,
      organizationId,
      permissions,
    })
    if (!result?.success) {
      return { valid: false, reason: 'Requested permissions exceed your current role' }
    }
  }

  return { valid: true }
}
