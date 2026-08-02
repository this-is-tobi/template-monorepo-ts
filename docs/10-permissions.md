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
| `audit`        | `read`                                                 | View audit logs                                    |

The same table is exported from `packages/shared` as `PERMISSION_MATRIX` and drives the permission pickers in the web app (API keys, custom org roles), so the UI can never offer a permission the server does not understand.

> `organization:create` is excluded — org creation is a platform-level setting (`allowOrganizationCreation`), not an org-level permission.
>
> `project:manage-members` is separate from `project:update` so that write access to a project does not include granting access to others (mirrors GitHub, where *write* ≠ collaborator management).

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

Fixed roles on the project roster (`ProjectMember.role`), defined in `access-control.ts` (`projectRoles`) using the **same `createAccessControl` instance as the org roles** — one resource:action model across the whole codebase, scoped here to the `project` resource:

| Role       | Actions on the project                                 |
| ---------- | ------------------------------------------------------ |
| **owner**  | `create`, `read`, `update`, `delete`, `manage-members` |
| **admin**  | `read`, `update`, `delete`, `manage-members`           |
| **member** | `read`, `update`                                       |
| **viewer** | `read`                                                 |

The permission middleware authorises a project action via `checkProjectRolePermission` (`permissions.ts`), which delegates to `projectRoles[role].authorize(...)`. Because each project role carries only `project` statements, a request for any other resource correctly fails the project-role check and falls through to the remaining checks.

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

The `ApiKey` model has a `permissions` field (JSON `resource:action` record). Semantics:

- **Declared permissions are authoritative** — when a key declares permissions and they do not cover the required action, the request is denied (`API_KEY_PERMISSIONS_DENIED`). It never falls through to the underlying user's roles, so a read-only key (e.g. `{ "*": ["read"] }`) can never perform writes.
- **Keys without declared permissions** (`permissions: null`) inherit the user's own permissions via the normal org/project/ownership checks.
- **Wildcards** are supported: `{ "*": ["*"] }` (everything), `{ "project": ["*"] }` (all actions on a resource), `{ "*": ["read"] }` (one action on any resource). Only platform admins may hold one — a wildcard grows silently every time the permission matrix does.
- **You cannot grant what you do not hold** — because the column is authoritative, it must never exceed its owner. Every write path validates it through the one `validateApiKeyPermissions` (`resources/api-keys/permissions.ts`): non-admins get no wildcards, and each requested `resource:action` is checked with `hasPermission` against **every** organization the key will be able to act in. Both the create interception in the auth router and `PUT /api-keys/:id` call it. An empty set is always allowed — it means "inherit the owner", which re-resolves against live membership on every request and so can never escalate.
- **Permissions pin scope** — a non-admin key carrying explicit permissions is always pinned to the organizations those permissions were validated against, at creation and on update alike. An unscoped key holding a set checked against one org would otherwise be usable in every other.
- **Scoping** — key `metadata` can restrict `organizationIds` / `projectIds`. Scope is checked *before* permissions on ID routes, and applied as query filters on list routes, so a scoped key never sees resources outside its scope. Scope is validated on every write: you can only scope a key to orgs and projects you are a member of.
- **No admin bypass** — API-key sessions are built without a platform role.
- **Validated when written, not when used** — the checks above run at create and update time. A key whose owner is later demoted keeps the permissions it was granted, because an authoritative column is read as-is at request time. Revoke keys as part of off-boarding; the audit log records every `apikey:update` with a before/after of the permission set. Keys with `permissions: null` are not affected — they re-resolve against live membership on every request, which is the safer default and why it is the default.
- **Owned by a user** — `referenceId` holds the owning user's id, with a foreign key that cascades. Deleting a user therefore *revokes* their keys rather than orphaning them; without the constraint a deleted user's key kept authenticating and built a session pointing at a row that no longer existed.

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

**Keys.** `POST /api/v1/projects/:id/service-keys` mints one, gated on `project:manage-members` — the same permission that governs granting a *person* access, held by exactly the project owner and admins. Scope is set by the server (`projectIds: [id]`, plus the project's organization) and ignores anything the caller sends, so a project admin cannot mint a key that reaches past the project they administer. Permissions are required and may not be empty: a key with none inherits its owner's, and a service account owns nothing, so it would be a credential that silently does nothing.

**Deletion.** The lifecycle is enforced by foreign keys rather than application code, so nothing can leave a credential behind:

```txt
organization ──cascade──▶ project ──cascade──▶ service account ──cascade──▶ api key
user ─────────cascade──▶ api key
user ─────────restrict─▶ project        (a person who owns projects cannot be deleted)
```

`project.organizationId` previously had **no** foreign key, so deleting an organization left its projects behind — invisible in every org-scoped list but still counting against quotas. That is fixed as part of the same chain.

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
