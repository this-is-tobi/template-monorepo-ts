# Permissions

## Concepts & scopes

Access control is organised in three nested scopes:

```txt
platform  →  organization  →  project
```

- **User** — an authenticated account. Users can belong to multiple organizations and projects; what they can do is determined by the roles they hold in each scope.
- **Organization** — the multi-tenancy unit. Every user automatically gets a **personal organization** on sign-up (slug `personal-<userId>`); they are its owner and it has no other members. Additional organizations can be created when `allowOrganizationCreation` permits.
- **Project** — a domain resource scoped to an organization (creation requires an active organization; the business layer rejects org-less projects). Projects have their own member roster with per-project roles.

### Principles

- **Deny by default** — a user with no role grants has no permissions; the org `member` role carries no permissions until a custom role or project membership grants some.
- **Additive** — permissions only grant; there are no deny rules (same model as Kubernetes RBAC). The only subtractive mechanism is the API-key cap (see below).
- **Platform admin bypass** — users with the platform `admin` role (BetterAuth admin plugin) skip all org/project checks. API-key sessions never carry a platform role, so keys can never obtain this bypass.

## Permission resolution

Implemented in `apps/api/src/modules/auth/permissions.ts` (`requirePermission`):

```txt
1.  Platform admin?                       → ALLOW (bypass all checks)
1b. Resolve org ID (once, reused below)
1c. API key scope valid?                  → continue / DENY (403 API_KEY_SCOPE_DENIED)
2.  API key with declared permissions?    → match: ALLOW / no match: DENY (authoritative — no fall-through)
3.  Org role grants permission?           → ALLOW
3b. Project-member role grants permission? → ALLOW
4.  Resource owner + ownership action?    → ALLOW
5.  Otherwise                             → DENY (403 INSUFFICIENT_PERMISSIONS)
```

**Ownership actions**: `read`, `update`, `delete` can be granted by resource ownership. `create` and `manage-members` require explicit permission.

## Resources and actions

Defined in `apps/api/src/modules/auth/access-control.ts` — this table is asserted against the code by `access-control.spec.ts`:

| Resource       | Actions                                                | Description                                        |
| -------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `organization` | `update`, `delete`                                     | Manage the current organization                    |
| `member`       | `create`, `update`, `delete`                           | Manage org members                                 |
| `invitation`   | `create`, `cancel`                                     | Manage invitations                                 |
| `ac`           | `create`, `read`, `update`, `delete`                   | Manage custom roles (dynamic access control)       |
| `project`      | `create`, `read`, `update`, `delete`, `manage-members` | Domain resource; `manage-members` gates the roster |
| `service-key`  | `read`, `create`, `delete`                             | A project's own API keys (see service accounts)    |
| `audit`        | `read`                                                 | View audit logs                                    |

The same table is exported from `packages/shared` as `PERMISSION_MATRIX` and drives the permission pickers in the web app (API keys, custom org roles), so the UI can never offer a permission the server does not understand.

> `organization:create` is excluded — org creation is a platform-level setting (`allowOrganizationCreation`), not an org-level permission.
>
> `project:manage-members` is separate from `project:update` so that write access to a project does not include granting access to others (mirrors GitHub, where *write* ≠ collaborator management).
>
> `service-key` is its own resource rather than another `project` action, because minting a credential is a different decision from adding a colleague: the built-in roles happen to grant both together, but a custom role can now hand out one without the other, and the role matrix in the web app shows exactly which.

### Platform settings are not in this vocabulary

Every statement above is **organization-scoped**: an org role can grant it, and `dynamicAccessControl` lets an org owner mint custom roles from the same list. Platform-wide concerns are therefore deliberately absent.

`PUT /api/v1/config` and `PUT /api/v1/theme` are gated on the **platform `admin` role** instead. This matters because a personal organization is created for every user at sign-up with role `owner` — an org-scoped `config:update` statement would hand *every registered account* the ability to rename the instance, disable registration, or enable maintenance mode and lock everyone else out.

## Predefined organization roles

| Role       | Permissions                                                        | Use case                                                               |
| ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **owner**  | All permissions                                                    | Org creator, full control                                              |
| **admin**  | All **except** `organization:delete` and `ac:create/update/delete` | Day-to-day management                                                  |
| **member** | None                                                               | No default permissions — access via project membership or custom roles |

Org-level `project:*` grants apply to **all projects in the organization** — an org owner/admin has full access to every org project without being on its roster.

## Project roles

Fixed roles on the project roster (`ProjectMember.role`), declared in `packages/shared` as `PROJECT_ROLES` and built into BetterAuth roles by `access-control.ts` using the **same `createAccessControl` instance as the org roles** — one resource:action model across the whole codebase:

| Role       | Actions                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| **owner**  | `project:read/update/delete/manage-members`, `service-key:read/create/delete` |
| **admin**  | `project:read/update/delete/manage-members`, `service-key:read/create/delete` |
| **member** | `project:read/update`                                                         |
| **viewer** | `project:read`                                                                |

No project role grants `project:create`. Creating a project is an organization-level action, so it comes from your org role — owning one project says nothing about the right to make another. `owner` and `admin` therefore differ only in that an owner cannot be removed from their own project.

They live in `shared` rather than in the API because the web app has to tell a user what a role grants **before** they assign it. A picker with its own hard-coded copy is how a UI ends up promising access the server refuses, so `access-control.spec.ts` asserts each built role authorises exactly its table entry and nothing beyond it.

The permission middleware authorises a project action via `checkProjectRolePermission` (`permissions.ts`), which delegates to `projectRoles[role].authorize(...)`.

### In the UI

The **Roles** tab on a project renders this table from `PROJECT_ROLES` via `RolePermissionMatrix.vue`, one row per `resource:action` with the sentence from `PERMISSION_DESCRIPTIONS` under it, and the reader's own role highlighted. The same component appears — with the sentences dropped — under the role dropdown in the add-member and change-role dialogs, so the choice is made against the alternatives rather than from a bare list of names.

A **Your access** card names the reader's role and how they come by it. Without one, a `viewer` and a `member` see the same page with the same buttons missing and no way to tell which they are.

Buttons are gated with `roleGrants(role, resource, action)` against the same table rather than a hand-written list of role names, so a control is shown exactly when the server would allow it. Use it for any control you add.

The project creator is added as `owner` automatically; the owner's role cannot be changed or removed through the API. Members can be added with role `admin`, `member`, or `viewer` (never `owner`). Custom per-project roles are a **non-goal** — use custom org roles instead.

## Middleware usage

### Basic permission check

```ts
// Require a single permission
app.post('/projects', {
  preHandler: [app.requireAuth, app.requirePermission({ project: ['create'] })],
}, handler)

// Require multiple permissions
app.post('/projects/:id/audit', {
  preHandler: [
    app.requireAuth,
    app.requirePermission({ project: ['read'], audit: ['read'] }),
  ],
}, handler)
```

### With ownership fallback

For resources with an `ownerId`, allow owners to access their own resources:

```ts
app.get('/projects/:id', {
  preHandler: [
    app.requireAuth,
    app.requirePermission({
      permissions: { project: ['read'] },
      getOwnerId: async (req) => {
        const project = await getProjectById(req.params.id)
        return project?.ownerId
      },
    }),
  ],
}, handler)
```

### Programmatic check

```ts
import { callHasPermission } from '~/modules/auth/permissions.js'

const result = await callHasPermission({
  headers: req.headers,
  userId,
  organizationId,
  permissions: { project: ['update'] },
})
if (!result?.success) {
  throw new APIError(403, 'FORBIDDEN', 'Insufficient permissions')
}
```

## Adding a new resource

1. **Define in access control** (`access-control.ts`):

```ts
export const ac = createAccessControl({
  // ... existing
  report: ['create', 'read', 'update', 'delete', 'export'],
})
```

2. **Add to predefined roles**:

```ts
export const ownerRole = ac.newRole({
  // ... existing
  report: ['create', 'read', 'update', 'delete', 'export'],
})

export const adminRole = ac.newRole({
  // ... existing
  report: ['create', 'read', 'update', 'delete'], // no export
})

// Member role has no default permissions — access is granted
// through project membership or custom org roles.
export const memberRole = ac.newRole({})
```

3. **Protect routes**:

```ts
app.get('/reports/:id/export', {
  preHandler: [app.requireAuth, app.requirePermission({ report: ['export'] })],
}, exportReport)
```

4. **Update this document** — the resource table above is asserted against `ac.statements` by `access-control.spec.ts`, so the test will fail until the table matches.

## Custom roles

Org owners can create custom org-scoped roles via BetterAuth's dynamic access control endpoints (requires `ac:*` permissions; the owner role has them, the admin role is read-only):

| Method | Path                             | Purpose                 |
| ------ | -------------------------------- | ----------------------- |
| POST   | `/auth/organization/create-role` | Create custom role      |
| POST   | `/auth/organization/update-role` | Update role permissions |
| POST   | `/auth/organization/delete-role` | Delete custom role      |
| GET    | `/auth/organization/list-roles`  | List org's custom roles |
| GET    | `/auth/organization/get-role`    | Get role details        |

Example:

```bash
POST /api/v1/auth/organization/create-role
{
  "role": "editor",
  "permissions": {
    "project": ["create", "read", "update"],
    "audit": ["read"]
  }
}
```

Custom roles can only grant statements that exist in the access-control definition above — the statement set is the ceiling.

## API key permissions

Every key runs in one of two modes. It is the most consequential choice on the key:

| `permissions`              | Mode        | What the key can do                                                                                                                                     |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `null` (default)           | **Inherit** | Whatever its owner can, resolved fresh on every request through the normal org / project / ownership checks. Demote the owner and the key narrows with them. |
| a `resource:action` record | **Capped**  | Exactly what it declares — never more, and never its owner's wider rights.                                                                              |

A declared set is a **cap, not a grant**: a read-only key (`{"*": ["read"]}`) cannot write even where its owner can, and a request the cap does not cover is refused with `API_KEY_PERMISSIONS_DENIED` rather than falling through to the owner's roles.

The trade is that a cap is read as written. A capped key does **not** narrow when its owner is demoted, so revoke keys as part of off-boarding — every change is in the audit log as `apikey:update` with a before/after. Inherit mode has no such gap, which is why it is the default.

### Rules for a declared set

All three write paths — creating a key, `PUT /api/v1/api-keys/:id`, and project service keys — go through one validator, `validateKeyGrant` (`apps/api/src/resources/api-keys/permissions.ts`).

| Rule                                 | What it means for you                                                                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Known vocabulary**                 | Every `resource:action` must appear in `PERMISSION_MATRIX`. Anything else is refused rather than stored, so adding a resource later can never switch on for keys that already happen to name it.                                 |
| **Wildcards are admin-only**         | `{"*": ["*"]}`, `{"project": ["*"]}` and `{"*": ["read"]}` are valid shapes, but only a platform admin may hold one — a wildcard widens by itself each time the matrix grows. A service key may never hold one at all.           |
| **You cannot grant what you lack**   | Each grant is checked with `hasPermission` against **every** organization the key can reach, so a two-org key cannot carry in one org a right you hold only in the other.                                                         |
| **Permissions imply a scope**        | A non-admin key with declared permissions is always pinned to the organizations it was checked against. An unscoped key is unrestricted, so "permissions, no scope" is not a state a key can reach.                              |

Changing the permissions **or** the scope re-runs all of it, against the set the key will end up carrying — moving a key to another organization is as much of a grant as widening what it may do. Refusals answer `403 INSUFFICIENT_PERMISSIONS` and name what was rejected (`Unknown permissions (billing:read)`, `Requested permissions exceed your current role`), and nothing is written.

Granting an empty set is always fine: it is how you return a key to inherit mode.

### Scope

Key `metadata` restricts `organizationIds` / `projectIds`. Scope is checked *before* permissions on ID routes and applied as a query filter on list routes, so a scoped key never sees resources outside it. You can only scope a key to orgs and projects you belong to.

### Other properties

- **No admin bypass** — API-key sessions are built without a platform role, so a key never inherits the platform-admin shortcut even when its owner is one.
- **Owned by a user** — `referenceId` carries the owning user's id under a cascading foreign key, so deleting a user *revokes* their keys rather than leaving credentials behind with no owner.

## Project service accounts

A user-owned key dies with the person who made it: when they leave, the key either breaks or lingers as a credential nobody owns. A **service account** is a `user` row that belongs to a *project*, so a CI token outlives whoever set it up.

It is deliberately a real user row rather than a separate principal type. Every authorisation path here resolves through `session.user.id` — `requirePermission`, the ownership fallbacks, `audit_log.actorId`. A parallel identity type would mean branching all of them, which is a poor trade for a template whose auth code is the part people read most.

What keeps it from being a back door:

| Property               | Why                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| No `account` row       | No password, no OIDC link — sign-in is impossible by construction, not by a flag someone can flip                  |
| Address on `.invalid`  | Reserved by RFC 2606 and guaranteed never to resolve, so a verified OIDC login can never be account-linked onto it |
| `emailVerified: false` | `accountLinking.trustedProviders` only adopts verified addresses                                                   |
| `role: 'service'`      | No permission check grants anything for it, and the admin user list filters on it                                  |
| Sign-up guard          | Registration on the reserved domain is refused, so the address cannot be squatted before provisioning              |
| Admin-endpoint guard   | `set-role`, `ban-user`, `impersonate-user` and friends refuse to operate on one                                    |
| Membership guard       | A service account cannot be added to another project, so its identity cannot be borrowed                           |

**Keys.** The three endpoints are gated on `service-key:read`, `service-key:create` and `service-key:delete` — its own resource rather than another `project` action, because minting a credential is a different decision from adding a colleague. The built-in roles grant both together (owner and admin), but a custom org role can hand out one without the other, and the Roles tab shows exactly which.

Scope is set by the server (`projectIds: [id]`, plus the project's organization) and ignores anything the caller sends, so a project admin cannot mint a key that reaches past the project they administer. Permissions are required and may not be empty: a key with none inherits its owner's, and a service account owns nothing, so it would be a credential that silently does nothing.

**A service key is capped by whoever mints it**, through the same `validateKeyGrant` as a personal key. Your project role is yours to delegate — a project admin can mint a read-only key on their own project without holding anything at organization level — but anything beyond it has to come from your org role. This matters more here than for a personal key: a service account holds no membership of its own, so the `permissions` column is the only thing granting the key anything at all.

**What a service key may never be granted** (`SERVICE_KEY_FORBIDDEN_PERMISSIONS`, shared so the picker hides exactly what the server refuses):

| Grant                    | Why not                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `service-key:*`          | The key could mint successors, so revoking it would not end the access it stands for — the replacement is already issued |
| `project:manage-members` | A machine credential would be able to hand a *person* access to the project                                              |

A service key may not hold a wildcard at all, platform admin or not: `{project: ['*']}` and `{'*': ['*']}` both cover the banned grants without naming them, which would leave the table above unenforceable. A service key names what it needs.

**Deletion.** The lifecycle is enforced by foreign keys rather than application code, so nothing can leave a credential behind:

```txt
organization ──cascade──▶ project ──cascade──▶ service account ──cascade──▶ api key
user ─────────cascade──▶ api key
user ─────────restrict─▶ project        (a person who owns projects cannot be deleted)
```

Note the first link: **deleting an organization deletes its projects**, and everything under them. The alternative — leaving projects behind pointing at an organization that no longer exists — makes them invisible to every org-scoped list while they still count against quotas, so the cascade is deliberate rather than incidental.

## Audit integration

When `MODULES__AUDIT=true`:

- `requirePermission` emits an audit entry **on every denial** (insufficient permissions, API-key permission or scope denial), with the full serialised permission record, the auth method (`session` / `api_key`), and the request method/URL.
- Successful **mutations** are audited by the business layer (`project:create`, `project:member:add`, `organization:member:update`, `apikey:create`, …).
- Successful *reads* are not audited by design — align retention/compliance expectations accordingly.

Query audit logs: `GET /api/v1/audit` (requires `audit:read`).

## Caching & staleness

| Layer                                | TTL         | Invalidation                                                       |
| ------------------------------------ | ----------- | ------------------------------------------------------------------ |
| Session cookie cache                 | 5 min       | Sign-out; expires naturally                                        |
| Org-permission cache (Redis)         | 30 s        | Immediately on member add/update/remove; TTL for custom-role edits |
| API-key permissions (request-scoped) | per request | —                                                                  |

Consequences: bans, role downgrades and org removals can take up to the cookie-cache TTL to take effect on open sessions; custom-role permission edits propagate within 30 s. Without Redis the org-permission cache is disabled (every check hits the database) — correct, just slower.

**Kubernetes note**: running more than one API replica requires Redis (`AUTH__REDIS__URL` or `AUTH__REDIS__SENTINEL_URLS`); without it, rate limiting and pending OIDC org-membership sync are per-replica. The auth module logs a startup warning when Redis is absent.

## Data model

### OrganizationRole (BetterAuth-managed)

```prisma
model OrganizationRole {
  id             String   @id @default(uuid())
  organizationId String
  role           String
  permission     String   // JSON: Record<string, string[]>
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@map("organization_role")
}
```

### Project (org-scoped)

```prisma
model Project {
  // ... existing fields
  organizationId String?  // nullable at the schema level; the API requires
                          // an active organization on create, so org-less
                          // rows are not creatable through the API

  @@index([organizationId])
  @@index([ownerId])
}
```

## Non-goals

Deliberately not implemented — revisit only when a concrete need appears:

- **Teams / groups** inside organizations (GitHub teams, GitLab subgroups).
- **Custom per-project roles** — custom org roles cover the need with one mechanism.
- **Relationship-based access control** (Zanzibar / OpenFGA) — overkill for a two-level scope model.
- **Deny rules** — the model stays additive; the API-key cap is the only subtractive mechanism.

## Testing

Permission behaviour is covered by:

- `apps/api/src/modules/auth/permissions.spec.ts` — resolution pipeline, API-key cap (regression: read-only wildcard key must not escalate), scope enforcement, project-role mapping, ownership fallback, audit-on-denial.
- `apps/api/src/modules/auth/access-control.spec.ts` — role invariants (owner covers all statements, admin exclusions, member empty) and **doc drift**: the resource table in this file is parsed and compared against `ac.statements`.
