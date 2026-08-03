import { ORGANIZATION_ROLES, PERMISSION_MATRIX, PROJECT_ROLES } from '@template-monorepo-ts/shared'
import { createAccessControl } from 'better-auth/plugins/access'

// ---------------------------------------------------------------------------
// Organization-level access control — BetterAuth Organization plugin
//
// This file provides a typed access-control model that can be passed to
// the `organization()` plugin for fine-grained permission checking.
//
// Usage (in auth.ts):
//   import { ac, ownerRole, adminRole, memberRole } from './access-control.js'
//   organization({ ac, roles: { owner: ownerRole, admin: adminRole, member: memberRole } })
//
// Resources:
//  - `organization` — the org itself (update settings, delete)
//  - `member`       — org membership (invite, remove, change role)
//  - `invitation`   — pending invitations (send, cancel)
//  - `ac`           — access control / role management (required for dynamicAccessControl)
//  - `project`      — projects within the org (create, manage)
//  - `service-key`  — a project's own API keys (read, create, delete)
//  - `audit`        — audit log (read)
//
// SECURITY — every statement here is ORGANIZATION-scoped.
//
// Anything listed becomes grantable by an org role, and `dynamicAccessControl`
// additionally lets an org owner mint custom roles from this same vocabulary.
// Platform-wide concerns (app config, theme) must therefore never appear:
// a personal organization is created for every user at sign-up with role
// `owner`, so a platform statement here would hand every registered account
// the power to rewrite platform settings — e.g. flip maintenance mode and
// lock the whole instance out. Those endpoints are gated on the platform
// `admin` role instead (`protect.admin`), which org membership never confers.
// ---------------------------------------------------------------------------

/**
 * Access control statements — which resources and actions exist.
 *
 * BetterAuth's `organization` plugin uses these to type-check role
 * definitions and permission checks.
 *
 * Derived from the shared `PERMISSION_MATRIX` so that the server vocabulary
 * and the permission pickers in the web app cannot drift apart.
 *
 * Note: `organization: ['create']` is intentionally absent — org creation is a
 * platform-level decision governed by the `allowOrganizationCreation` config,
 * not by an org-level role.
 *
 * `project: ['manage-members']` gates the project roster (add / update /
 * remove members) separately from `update` (project settings), mirroring
 * GitHub where "write" access does not grant collaborator management.
 */
export const ac = createAccessControl(
  // Derived rather than enumerated: listing the resources by hand meant a new
  // one had to be added in two places, and forgetting the second left the
  // server unable to authorise a permission its own matrix advertised.
  Object.fromEntries(
    Object.entries(PERMISSION_MATRIX).map(([resource, actions]) => [resource, [...actions]]),
  ) as { [K in keyof typeof PERMISSION_MATRIX]: string[] },
)

// ---------------------------------------------------------------------------
// Org-level roles
//
//  owner  — full control (org creator)
//  admin  — manage members, invitations, projects; cannot delete org or manage roles
//  member — read-only project access at org level
// ---------------------------------------------------------------------------

/**
 * Built from the shared role tables rather than spelled out here, so the
 * permission matrix the web app shows a user before they assign a role is by
 * construction the one the server will enforce afterwards.
 *
 * The cast is the same shape concern as `ac` itself: the shared tables are
 * deeply readonly (`as const`), which `newRole` does not accept even though it
 * only reads them.
 */
function asStatements(permissions: Record<string, readonly string[]>) {
  return Object.fromEntries(
    Object.entries(permissions).map(([resource, actions]) => [resource, [...actions]]),
  ) as never
}

/** Owner role — full control over the organization and all its resources. */
export const ownerRole = ac.newRole(asStatements(ORGANIZATION_ROLES.owner.permissions))

/** Admin role — manages members, invitations, and projects; cannot delete org. */
export const adminRole = ac.newRole(asStatements(ORGANIZATION_ROLES.admin.permissions))

/**
 * Member role — no default permissions.
 *
 * Org members must be granted access through project membership or custom
 * org roles. This follows the principle: "no permissions until assigned
 * to specific roles".
 */
export const memberRole = ac.newRole({})

// ---------------------------------------------------------------------------
// Project-level roles
//
// A user's project membership grants these permissions on top of their org
// role (additive).  They are built from the SAME access controller (`ac`) as
// the org roles above, scoped to the `project` resource — so the whole
// codebase has a single resource:action RBAC model, and each role's actions
// are type-checked against the `project` statement.
//
//  owner   — full control of the project, including roster management
//  admin   — manage the project and its roster; cannot `create` (project
//            creation is an org-level action, not a per-project one)
//  member  — read + update project settings; no roster management
//            (mirrors GitHub "write": collaborators cannot manage access)
//  viewer  — read-only
// ---------------------------------------------------------------------------

/** Project owner — full control of the project and its roster. */
export const projectOwnerRole = ac.newRole(asStatements(PROJECT_ROLES.owner.permissions))

/** Project admin — manage the project and its roster; cannot create projects. */
export const projectAdminRole = ac.newRole(asStatements(PROJECT_ROLES.admin.permissions))

/** Project member — read and update settings; no roster management. */
export const projectMemberRole = ac.newRole(asStatements(PROJECT_ROLES.member.permissions))

/** Project viewer — read-only. */
export const projectViewerRole = ac.newRole(asStatements(PROJECT_ROLES.viewer.permissions))

/**
 * Project role registry — maps the membership `role` column to its access
 * controller role.  Consumed by the permission middleware to authorise
 * project-scoped actions.
 */
export const projectRoles = {
  owner: projectOwnerRole,
  admin: projectAdminRole,
  member: projectMemberRole,
  viewer: projectViewerRole,
} as const

// `ProjectRoleName` lives in `@template-monorepo-ts/shared` alongside the role
// table these are built from — a second copy here was unused and, now that the
// names collide, actively misleading about which one is authoritative.
