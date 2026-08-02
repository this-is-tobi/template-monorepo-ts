/**
 * Single source of truth for the RBAC vocabulary — which resources exist and
 * which actions each supports.
 *
 * Consumed by:
 *  - the API, to build the BetterAuth access controller (`ac`)
 *  - the web app, to render permission pickers (API keys, custom org roles)
 *
 * Keeping one definition means a picker can never offer a permission the
 * server does not understand, and a new action shows up in both places at
 * once.
 *
 * IMPORTANT — this vocabulary is **organization-scoped**. A resource listed
 * here can be granted by an org role or a custom role, so platform-wide
 * concerns (app config, theme) must NOT appear: an org owner would then be
 * able to grant themselves platform powers. Those endpoints are gated on the
 * platform `admin` role instead.
 */
export const PERMISSION_MATRIX = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete', 'manage-members'],
  audit: ['read'],
} as const satisfies Record<string, readonly string[]>

/** Resource names in the permission vocabulary (e.g. `'project'`). */
export type PermissionResource = keyof typeof PERMISSION_MATRIX

/** Ordered resource list — drives the rows of a permission picker. */
export const PERMISSION_RESOURCES = Object.keys(PERMISSION_MATRIX) as PermissionResource[]

/**
 * Mutable copy of the matrix for UI code that indexes it with a plain string.
 *
 * The `as const` original is deeply readonly, which fights template code that
 * only ever reads it; this keeps the strict version available for type-level
 * use while giving components a plain, indexable record.
 */
export const permissionMatrix: Record<string, string[]> = Object.fromEntries(
  Object.entries(PERMISSION_MATRIX).map(([resource, actions]) => [resource, [...actions]]),
)
