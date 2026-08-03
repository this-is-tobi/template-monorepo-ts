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
  'service-key': ['read', 'create', 'delete'],
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

/**
 * What each `resource:action` actually lets someone do.
 *
 * `project:manage-members` is not self-explanatory, and neither is `ac:create`
 * — a permission picker that only shows identifiers asks the person granting
 * access to already know the answer. Written in the second person, describing
 * the consequence rather than restating the name.
 *
 * Every action in `PERMISSION_MATRIX` must appear here; a spec enforces it, so
 * a new action cannot ship without words to explain it.
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'organization:update': 'Rename the organization and change its settings.',
  'organization:delete': 'Permanently delete the organization and everything in it.',

  'member:create': 'Add people to the organization directly.',
  'member:update': 'Change what role someone has in the organization.',
  'member:delete': 'Remove people from the organization.',

  'invitation:create': 'Invite people to join the organization by email.',
  'invitation:cancel': 'Withdraw invitations that have not been accepted yet.',

  'ac:create': 'Define new custom roles for the organization.',
  'ac:read': 'See the custom roles and what each one grants.',
  'ac:update': 'Change what an existing custom role grants.',
  'ac:delete': 'Delete custom roles, removing them from anyone who holds one.',

  'project:create': 'Start new projects in the organization.',
  'project:read': 'View the project and its contents.',
  'project:update': 'Change the project name, description and settings.',
  'project:delete': 'Permanently delete the project, its members and its keys.',
  'project:manage-members': 'Add and remove people, and change their role on the project.',

  'service-key:read': 'See which service keys exist and what they can do — never their secrets.',
  'service-key:create': 'Mint new service keys, which act on the project without a person signing in.',
  'service-key:delete': 'Revoke service keys, immediately breaking anything using them.',

  'audit:read': 'Read the audit log of who did what.',
}

/** The description for a `resource:action`, or `undefined` if none is written. */
export function describePermission(resource: string, action: string): string | undefined {
  return PERMISSION_DESCRIPTIONS[`${resource}:${action}`]
}

// ---------------------------------------------------------------------------
// Built-in roles
//
// Defined here, not in the API, because the web app has to be able to tell a
// user what a role will grant *before* they assign it. Duplicating the lists
// in a picker is how a UI ends up quietly promising access the server refuses
// — so `access-control.ts` builds its BetterAuth roles from exactly these
// tables, and a spec asserts the two agree.
//
// Both role sets are ORGANIZATION-scoped in the sense of the matrix above:
// nothing here can grant a platform-level power.
// ---------------------------------------------------------------------------

/** What a built-in role grants, plus the words a picker should show for it. */
export interface RoleDefinition {
  /** Permissions granted, as `resource → actions`. */
  permissions: Record<string, readonly string[]>
  /** One line, written for whoever is about to assign it. */
  summary: string
}

/**
 * Project-membership roles — additive on top of whatever the org role grants.
 *
 * `admin` cannot `create`: creating a project is an organization-level action,
 * not something you do from inside one. `member` deliberately stops short of
 * `manage-members`, mirroring GitHub, where write access does not let you hand
 * out access.
 */
export const PROJECT_ROLES = {
  owner: {
    permissions: {
      project: ['create', 'read', 'update', 'delete', 'manage-members'],
      'service-key': ['read', 'create', 'delete'],
    },
    summary: 'Full control, including deleting the project and managing who can reach it.',
  },
  admin: {
    permissions: {
      project: ['read', 'update', 'delete', 'manage-members'],
      'service-key': ['read', 'create', 'delete'],
    },
    summary: 'Manage the project, its members and its service keys. Cannot create new projects.',
  },
  member: {
    permissions: { project: ['read', 'update'] },
    summary: 'Read and change the project. Cannot manage members or service keys.',
  },
  viewer: {
    permissions: { project: ['read'] },
    summary: 'Read-only access.',
  },
} as const satisfies Record<string, RoleDefinition>

/** Organization roles. `member` is deliberately empty — deny by default. */
export const ORGANIZATION_ROLES = {
  owner: {
    permissions: {
      organization: ['update', 'delete'],
      member: ['create', 'update', 'delete'],
      invitation: ['create', 'cancel'],
      ac: ['create', 'read', 'update', 'delete'],
      project: ['create', 'read', 'update', 'delete', 'manage-members'],
      'service-key': ['read', 'create', 'delete'],
      audit: ['read'],
    },
    summary: 'Full control of the organization, its roles and every project in it.',
  },
  admin: {
    permissions: {
      organization: ['update'],
      member: ['create', 'update', 'delete'],
      invitation: ['create', 'cancel'],
      ac: ['read'],
      project: ['create', 'read', 'update', 'delete', 'manage-members'],
      'service-key': ['read', 'create', 'delete'],
      audit: ['read'],
    },
    summary: 'Manage members, invitations and projects. Cannot delete the organization or edit roles.',
  },
  member: {
    permissions: {},
    summary: 'No permissions on their own — access comes from project membership or a custom role.',
  },
} as const satisfies Record<string, RoleDefinition>

export type ProjectRoleName = keyof typeof PROJECT_ROLES
export type OrganizationRoleName = keyof typeof ORGANIZATION_ROLES

/** Project roles, strongest first — the order a picker should list them in. */
export const PROJECT_ROLE_NAMES = Object.keys(PROJECT_ROLES) as ProjectRoleName[]

/** Organization roles, strongest first. */
export const ORGANIZATION_ROLE_NAMES = Object.keys(ORGANIZATION_ROLES) as OrganizationRoleName[]

/**
 * Does `role` grant `resource:action`?
 *
 * Answers the question a UI actually has — "should this button be here?" —
 * without every caller re-deriving it from the permission record.
 */
export function roleGrants(
  role: string,
  resource: string,
  action: string,
  roles: Record<string, RoleDefinition> = PROJECT_ROLES,
): boolean {
  return roles[role]?.permissions[resource]?.includes(action) ?? false
}

/**
 * Permissions a project's service key may never be granted.
 *
 * `service-key:*` would let a credential mint successors, so revoking it would
 * not end the access it stands for — the replacement is already issued, and
 * nobody reviewing the revocation would see it. `project:manage-members` would
 * let a machine credential hand a *person* access to the project.
 *
 * Both are authority that should require someone to sign in. Shared so the
 * permission picker hides exactly what the server refuses.
 */
export const SERVICE_KEY_FORBIDDEN_PERMISSIONS: Record<string, readonly string[]> = {
  'service-key': ['read', 'create', 'delete'],
  project: ['manage-members'],
}

/** Is this `resource:action` off-limits to a service key? */
export function isForbiddenServiceKeyGrant(resource: string, action: string): boolean {
  return SERVICE_KEY_FORBIDDEN_PERMISSIONS[resource]?.includes(action) ?? false
}

/**
 * The forbidden grants a permission set is asking for, as `resource:action`.
 * Empty when the set is acceptable.
 */
export function forbiddenServiceKeyGrants(permissions: Record<string, string[]>): string[] {
  return Object.entries(permissions).flatMap(([resource, actions]) => {
    const banned = SERVICE_KEY_FORBIDDEN_PERMISSIONS[resource]
    if (!banned) return []
    // A wildcard action asks for everything on the resource, banned included.
    if (actions.includes('*')) return [`${resource}:*`]
    return actions.filter(action => banned.includes(action)).map(action => `${resource}:${action}`)
  })
}

/** Flatten a role's grants to `resource:action` strings, for display. */
export function roleGrantList(
  role: string,
  roles: Record<string, RoleDefinition> = PROJECT_ROLES,
): string[] {
  const definition = roles[role]
  if (!definition) return []
  return Object.entries(definition.permissions)
    .flatMap(([resource, actions]) => actions.map(action => `${resource}:${action}`))
}
