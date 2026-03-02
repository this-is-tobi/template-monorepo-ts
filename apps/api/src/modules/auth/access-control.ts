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
// The default organization plugin already provides sensible owner/admin/member
// roles.  Import these when you need to customise which actions each role
// can perform — especially when adding domain-specific resources like
// `project`, `document`, etc.
// ---------------------------------------------------------------------------

/**
 * Access control statements — which resources and actions exist.
 *
 * BetterAuth's `organization` plugin uses these to type-check role
 * definitions and permission checks.
 *
 * Resources:
 *  - `organization` — the org itself (update settings, delete)
 *  - `member`       — org membership (invite, remove, change role)
 *  - `invitation`   — pending invitations (send, cancel)
 *  - `project`      — projects within the org (create, manage)
 */
export const ac = createAccessControl({
  organization: ['create', 'update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
})

// ---------------------------------------------------------------------------
// Org-level roles
//
//  owner  — full control (org creator)
//  admin  — manage members, invitations, projects; cannot delete org
//  member — read-only project access at org level
// ---------------------------------------------------------------------------

export const ownerRole = ac.newRole({
  organization: ['create', 'update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
})

export const adminRole = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
})

export const memberRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  project: ['read'],
})
