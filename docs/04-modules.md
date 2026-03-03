# Modules

## Module system

The API uses a **plug-and-play module system** that allows features to be enabled or disabled independently via environment variables. Each module is a self-contained unit that can:

- Register Fastify decorators and routes.
- Bootstrap data after the database is ready.
- Release resources on graceful shutdown.

A module implements the `AppModule` interface:

```ts
interface AppModule {
  name: string
  register: (app: FastifyInstance) => Promise<void>  // decorators + routes
  onReady?: (ctx: ModuleContext) => Promise<void>     // post-DB bootstrap
  onClose?: (ctx: ModuleContext) => Promise<void>     // graceful shutdown
}
```

When a module is **disabled**, no-op decorators are installed so route code can always reference `app.requireAuth` / `app.requireRole` without conditional imports.

### Toggling modules

```sh
# Disable the auth module entirely (no-op decorators, no auth routes)
MODULES__AUTH=false

# Enable optional modules
MODULES__TENANT=true
MODULES__AUDIT=true
```

### Adding a new module

1. Create `apps/api/src/modules/<name>/index.ts` that exports a default `AppModule`.
2. Add a toggle entry (`config.modules.<name>`) to `ConfigSchema` in `config.ts`.
3. Import and register it inside `setupModules()` in `apps/api/src/modules/index.ts`.

## Auth module

The auth module is built on top of [BetterAuth](https://www.better-auth.com/), a type-safe, batteries-included authentication library. It handles **authentication, organization management, and access control** — roles and permissions are managed via BetterAuth's organization plugin with typed access control definitions (see `access-control.ts`).

### Features

| Feature                   | Details                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Email + password          | Built-in sign-up / sign-in / password reset                                                          |
| Bearer token              | Machine-to-machine API access via `Authorization: Bearer <token>`                                    |
| Session management        | Cookie-based sessions with optional Redis secondary storage for scaling                              |
| Two-factor authentication | TOTP-based 2FA (compatible with any authenticator app)                                               |
| Admin API                 | Server-side user management (create, ban, set roles) via BetterAuth admin plugin                     |
| Organization management   | Multi-tenant organizations with members, invitations, and role-based access (owner / admin / member) |
| API keys                  | Per-user or per-organization API keys with prefix, rate limiting, and permissions                    |
| JWT / JWKS                | JWT token issuance with automatic key rotation via a JWKS endpoint                                   |
| OpenAPI reference         | Auto-generated OpenAPI 3.0 schema and interactive Scalar UI at `/api/v1/auth/reference`              |
| Keycloak OIDC federation  | Optional SSO via Keycloak with configurable role & group mapping                                     |
| Profile fields            | `firstname`, `lastname`, `bio` additional user fields                                                |

### Middleware

```ts
// Require a valid session (cookie or Bearer token)
{ preHandler: [app.requireAuth] }

// Require one of the listed roles (calls requireAuth internally)
{ preHandler: [app.requireRole('admin')] }
```

### Keycloak OIDC mapping

When Keycloak is enabled, users can authenticate via OIDC (SSO). Profile fields (`given_name`, `family_name`) are always mapped to `firstname` / `lastname`. Role and group mapping is **opt-in** via configuration:

| Mode                     | `MAP_ROLES` | `MAP_GROUPS` | Roles source                 | Use case                                           |
| ------------------------ | :---------: | :----------: | ---------------------------- | -------------------------------------------------- |
| **Integrated** (default) |   `false`   |   `false`    | BetterAuth admin plugin      | Public app with social IDPs — roles managed in-app |
| **Enterprise roles**     |   `true`    |   `false`    | Keycloak `realm_roles` claim | Corp Keycloak — realm roles synced on every login  |
| **Enterprise groups**    |   `false`   |    `true`    | Keycloak `groups` claim      | Corp Keycloak — groups used as roles               |
| **Full enterprise**      |   `true`    |    `true`    | Both (merged, deduplicated)  | Keycloak is the single source of truth             |

### Admin bootstrap

On first startup, if `ADMIN__EMAIL` and `ADMIN__PASSWORD` are set, a default admin user is created automatically. The operation is idempotent — it is safely skipped if the user already exists.

## Audit module

The audit module provides **structured audit logging** backed by a Prisma repository. It exposes an `auditLogger` decorator on the Fastify instance.

**Enable:** `MODULES__AUDIT=true`

### Usage in route handlers

```ts
// Synchronous (awaits write, errors surface to the route handler)
await app.auditLogger!.log({
  actorId: req.session!.user.id,
  action: 'delete',
  resourceType: 'project',
  resourceId: projectId,
  details: { reason: 'cleanup' },
})

// Fire-and-forget (non-blocking, errors are swallowed)
app.auditLogger!.logAsync({
  actorId: req.session!.user.id,
  action: 'update',
  resourceType: 'organization',
  resourceId: orgId,
})
```

### Audit entry schema

| Field          | Type     | Required | Description                            |
| -------------- | -------- | :------: | -------------------------------------- |
| `actorId`      | `string` |    ✓     | ID of the user performing the action   |
| `action`       | `string` |    ✓     | Action name (e.g. `create`, `delete`)  |
| `resourceType` | `string` |    ✓     | Resource type (e.g. `user`, `project`) |
| `resourceId`   | `string` |    ✓     | ID of the affected resource            |
| `details`      | `object` |          | Arbitrary metadata about the action    |
