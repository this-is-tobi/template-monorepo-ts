# Permissions

## Overview

The template uses **BetterAuth's organization plugin** with `dynamicAccessControl` for role-based access control. Permissions follow a `resource:action` format (e.g., `project:create`, `audit:read`).

### Permission resolution

```txt
1. Platform admin? → ALLOW (bypass all checks)
1b. Resolve org ID (once, reused below)
1c. API key scope valid? → continue / DENY
2. API key with permission? → ALLOW
3. Org role grants permission? → ALLOW
3b. Project-member role grants permission? → ALLOW
4. Resource owner + ownership action? → ALLOW
5. Otherwise → DENY (403)
```

**Ownership actions**: `read`, `update`, `delete` can be granted by resource ownership. `create` requires explicit permission.

## Resources and actions

| Resource | Actions | Description |
|----------|---------|-------------|
| `organization` | `update`, `delete` | Manage the current organization |
| `member` | `create`, `update`, `delete` | Manage org members |
| `invitation` | `create`, `update`, `delete` | Manage invitations |
| `role` | `create`, `read`, `update`, `delete` | Manage custom roles |
| `project` | `create`, `read`, `update`, `delete` | Domain resource (example) |
| `setting` | `read`, `update` | Platform settings (config, theme) |
| `audit` | `read` | View audit logs |

> `organization:create` is excluded — org creation is a platform-level setting (`allowOrganizationCreation`), not an org-level permission.

## Predefined roles

| Role | Permissions | Use case |
|------|-------------|----------|
| **owner** | All permissions | Org creator, full control |
| **admin** | All except `organization:delete`, `role:create/update/delete` | Day-to-day management |
| **member** | None | No default permissions — access via project membership or custom roles |

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
import { hasPermission } from '~/modules/auth/permissions.js'

const allowed = await hasPermission(req, { project: ['update'] })
if (!allowed) {
  throw new APIError(403, 'FORBIDDEN', 'Insufficient permissions')
}
```

## Adding a new resource

1. **Define in access control** (`access-control.ts`):

```ts
export const accessControl = createAccessControl({
  // ... existing
  report: ['create', 'read', 'update', 'delete', 'export'],
})
```

2. **Add to predefined roles**:

```ts
export const ownerRole = accessControl.newRole({
  // ... existing
  report: ['create', 'read', 'update', 'delete', 'export'],
})

export const adminRole = accessControl.newRole({
  // ... existing
  report: ['create', 'read', 'update', 'delete'],  // no export
})

// Member role has no default permissions — access is granted
// through project membership or custom org roles.
export const memberRole = accessControl.newRole({})
```

3. **Protect routes**:

```ts
app.get('/reports/:id/export', {
  preHandler: [app.requireAuth, app.requirePermission({ report: ['export'] })],
}, exportReport)
```

## Custom roles

Org owners/admins can create custom roles via BetterAuth's endpoints (requires `role:*` permissions):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/organization/create-role` | Create custom role |
| POST | `/auth/organization/update-role` | Update role permissions |
| POST | `/auth/organization/delete-role` | Delete custom role |
| GET | `/auth/organization/list-roles` | List org's custom roles |
| GET | `/auth/organization/get-role` | Get role details |

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

## API key permissions

The `ApiKey` model has a `permissions` field (JSON). When creating an API key, specify which `resource:action` pairs the key can perform.

Users cannot create API keys with more permissions than they have.

## Audit integration

When `MODULES__AUDIT=true`, every `requirePermission` call emits an audit entry:

```ts
app.auditLogger?.logAsync({
  actorId: user.id,
  action: `${resource}:${action}`,
  resourceType: resource,
  resourceId: extractResourceId(req),
  details: {
    granted: true | false,
    grantedBy: 'platform_admin' | 'org_role' | 'ownership' | null,
    role: member?.role,
    organizationId: orgId,
  },
})
```

Query audit logs: `GET /api/v1/audit` (requires `audit:read`).

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
  organizationId String?  // Optional org scope

  @@index([organizationId])
  @@index([ownerId])
}
```

## Testing

### Permission middleware tests

```ts
describe('requirePermission', () => {
  it('should allow platform admin without org context')
  it('should allow org member with matching permission')
  it('should deny org member without matching permission')
  it('should allow resource owner for ownership actions')
  it('should deny resource owner for non-ownership actions')
  it('should allow API key with matching permissions')
  it('should emit audit log on allow/deny')
})
```

### Access control tests

```ts
describe('access control', () => {
  it('should define all expected resources')
  it('owner role should have all permissions')
  it('admin role should not have role:create/update/delete')
  it('member role should have no default permissions')
})
```
