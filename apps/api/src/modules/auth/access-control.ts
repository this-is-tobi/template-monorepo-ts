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
//  - `config`       — platform settings (read, update)
//  - `theme`        — platform theme (read, update)
//  - `audit`        — audit log (read)
// ---------------------------------------------------------------------------

/**
 * Access control statements — which resources and actions exist.
 *
 * BetterAuth's `organization` plugin uses these to type-check role
 * definitions and permission checks.
 *
 * Note: `organization: ['create']` is intentionally absent — org creation is a
 * platform-level decision governed by the `allowOrganizationCreation` config,
 * not by an org-level role.
 *
 * `project: ['manage-members']` gates the project roster (add / update /
 * remove members) separately from `update` (project settings), mirroring
 * GitHub where "write" access does not grant collaborator management.
 */
export const ac = createAccessControl({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete', 'manage-members'],
  config: ['read', 'update'],
  theme: ['read', 'update'],
  audit: ['read'],
})

// ---------------------------------------------------------------------------
// Org-level roles
//
//  owner  — full control (org creator)
//  admin  — manage members, invitations, projects; cannot delete org or manage roles
//  member — read-only project access at org level
// ---------------------------------------------------------------------------

/** Owner role — full control over the organization and all its resources. */
export const ownerRole = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete', 'manage-members'],
  config: ['read', 'update'],
  theme: ['read', 'update'],
  audit: ['read'],
})

/** Admin role — manages members, invitations, and projects; cannot delete org. */
export const adminRole = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  ac: ['read'],
  project: ['create', 'read', 'update', 'delete', 'manage-members'],
  config: ['read'],
  theme: ['read'],
  audit: ['read'],
})

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
export const projectOwnerRole = ac.newRole({
  project: ['create', 'read', 'update', 'delete', 'manage-members'],
})

/** Project admin — manage the project and its roster; cannot create projects. */
export const projectAdminRole = ac.newRole({
  project: ['read', 'update', 'delete', 'manage-members'],
})

/** Project member — read and update settings; no roster management. */
export const projectMemberRole = ac.newRole({
  project: ['read', 'update'],
})

/** Project viewer — read-only. */
export const projectViewerRole = ac.newRole({
  project: ['read'],
})

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

export type ProjectRoleName = keyof typeof projectRoles
