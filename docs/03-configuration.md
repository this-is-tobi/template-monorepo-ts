# Configuration

## Configuration system

A configuration management system enables type checking and automatic value merging in the following priority order (highest wins):

```txt
default variables → configuration file variables → environment variables
```

Environment variables are parsed to extract only keys with specific prefixes (improving security). Keys are split by `__` *(double underscore)* to reconstruct the nested configuration object. Arrays must be passed as JSON strings.

| Prefix        | Namespace   | Description                        |
| ------------- | ----------- | ---------------------------------- |
| `SERVER__`    | `server`    | Server host, port, domain          |
| `DB__`        | `db`        | Database connection URL and pool   |
| `AUTH__`      | `auth`      | BetterAuth secret, base URL, Redis |
| `OIDC__`      | `oidc`      | OIDC federation settings           |
| `BOOTSTRAP__` | `bootstrap` | Initial admin user credentials     |
| `MODULES__`   | `modules`   | Feature module toggles             |
| `PLATFORM__`  | `platform`  | Platform-level app configuration   |

Variables matching a known prefix but no option are logged as warnings at startup, with a did-you-mean hint for misplaced `__` — a silently ignored typo is how a feature "mysteriously" stays off. `OTEL_*` is the one namespace outside this system, because the OpenTelemetry SDK reads those names itself; see [Observability](#observability).

**Configuration files:**

- Development: `apps/api/config-example.json`
- Production: `/app/config.json` (mounted at runtime)

## Configuration tiers

Not every option belongs in the same place. The template splits configuration into three tiers, and where a setting lives is a deliberate choice rather than an accident:

| Tier                    | Examples                                                                   | Source                        | Changeable at runtime         |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| **Boot infrastructure** | `DB__URL`, `AUTH__SECRET`, `SERVER__PORT`, `OIDC__CLIENT_SECRET`, `OTEL_*` | env / file **only**           | No — redeploy                 |
| **Boot behaviour**      | rate limits, `MODULES__*`, OIDC federation                                 | env / file **only**           | No — wired up at startup      |
| **Runtime policy**      | app name, registration, quotas, maintenance mode, audit retention          | database, env/file can pin it | Yes — from Settings > General |

Two reasons the first tier stays out of the database:

- `DB__URL` is needed *to read the database*, so storing it there cannot work.
- Anything wired up at boot (the Fastify rate limiter, BetterAuth, module registration) cannot be swapped without a restart. A toggle that silently requires a redeploy is worse than no toggle.

**Runtime policy with an override.** Tier-3 settings live in the `web_setting` table and are edited from the admin UI. An operator who needs them immutable — GitOps, compliance, ephemeral environments — pins them with `PLATFORM__*` env vars or the `platform` section of the config file. Pinned fields are returned in `lockedFields`, and the admin UI renders them read-only with the exact variable name that controls them. Pinned values are never written back to the database, so removing the override restores whatever was last chosen in the UI.

**Seeing everything.** Every boot-tier option is visible read-only under **Settings > System > Runtime configuration**: the effective value and which layer supplied it (`env`, `file`, or `default`). Secret values are redacted server-side and never sent to the browser — the view reports only whether one is set. The endpoint (`GET /api/v1/config/runtime`) requires the platform `admin` role because it exposes deployment topology.

## API

The API is built on top of [Fastify](https://fastify.dev/) with the following plugins already configured:

- [@fastify/cookie](https://github.com/fastify/fastify-cookie)
- [@fastify/cors](https://github.com/fastify/fastify-cors)
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
- [@fastify/otel](https://github.com/fastify/fastify-otel)
- [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)

The API is fully typed and validated through [Zod](https://zod.dev/) schemas, with a custom type-safe routing system providing full type safety for request/response validation and automatic OpenAPI documentation generation.

> *__Notes:__*
> - *Swagger UI is available at `http(s)://<api_domain>/swagger-ui`. It exposes two spec sources: **Application API** (Fastify routes) and **Auth API** (BetterAuth — select from the top-right dropdown). A standalone Scalar reference UI for auth is also available at `/api/v1/auth/reference`.*
> - *A `getApiClient` function is exported from the `shared` package, providing a typed fetch client for other apps and packages that consume the API.*

## Database

[Prisma](https://www.prisma.io/) is used as the ORM, providing type-safe database access and migration management. The schema is split across multiple files:

- `prisma/schema.prisma` — generator and datasource configuration
- `prisma/auth.prisma` — BetterAuth-managed models (user, session, account, org, member, invitation, apiKey, jwks)
- `prisma/audit.prisma` — audit log model

The codebase is structured to allow migration to other ORMs (e.g. [Drizzle](https://orm.drizzle.team/), [Mongoose](https://mongoosejs.com/)) by replacing the `prisma/` folder and updating the `resources/**/queries.ts` files.

## Endpoints

| Method   | Path                                          | Auth          | Description                                               |
| -------- | --------------------------------------------- | ------------- | --------------------------------------------------------- |
| `GET`    | `/api/v1/healthz`                             | Public        | Startup probe                                             |
| `GET`    | `/api/v1/readyz`                              | Public        | Readiness probe (checks DB)                               |
| `GET`    | `/api/v1/livez`                               | Public        | Liveness probe                                            |
| `GET`    | `/api/v1/version`                             | Public        | Current API version                                       |
| `ANY`    | `/api/v1/auth/*`                              | Public / Auth | BetterAuth catch-all                                      |
| `GET`    | `/api/v1/auth/reference`                      | Public        | Interactive OpenAPI reference (Scalar UI)                 |
| `GET`    | `/api/v1/projects`                            | Authenticated | List own projects (admin: all projects)                   |
| `GET`    | `/api/v1/projects/:id`                        | Authenticated | Get own project by ID (admin: any)                        |
| `POST`   | `/api/v1/projects`                            | Authenticated | Create project (owner = current user)                     |
| `PUT`    | `/api/v1/projects/:id`                        | Authenticated | Update own project (admin: any)                           |
| `DELETE` | `/api/v1/projects/:id`                        | Authenticated | Delete own project (admin: any)                           |
| `GET`    | `/api/v1/theme`                               | Public        | Get platform theme configuration                          |
| `PUT`    | `/api/v1/theme`                               | Admin         | Update platform theme configuration                       |
| `GET`    | `/api/v1/config`                              | Public        | Get app configuration (e.g. registration)                 |
| `PUT`    | `/api/v1/config`                              | Admin         | Update app configuration                                  |
| `GET`    | `/api/v1/config/runtime`                      | Admin         | Introspect resolved server config (secrets redacted)      |
| `GET`    | `/api/v1/audit`                               | Audit:Read    | Query audit logs (admin: all; org admin: own org)         |
| `GET`    | `/api/v1/organizations/:organizationId/audit` | Audit:Read    | Query audit logs scoped to a specific organization        |
| `GET`    | `/api/v1/admin/organizations`                 | Admin         | List all organizations with member counts                 |
| `GET`    | `/api/v1/admin/organizations/:id`             | Admin         | Get organization by ID with members and invitations       |
| `GET`    | `/api/v1/admin/api-keys`                      | Admin         | List all API keys                                         |
| `GET`    | `/api/v1/admin/api-keys/:id`                  | Admin         | Get API key by ID                                         |
| `GET`    | `/api/v1/admin/users/:id`                     | Admin         | Get user by ID with organizations, projects, and API keys |
| `PUT`    | `/api/v1/api-keys/:id`                        | Authenticated | Update own API key (name, permissions, metadata)          |

> **Ownership rules**: regular users can only read, update, or delete projects they own (`ownerId` matches their session user ID). Admins bypass ownership checks. The `ownerId` is set automatically from the session on creation — it is not a caller-supplied field.

## Environment variables

### Database

| Variable           | Description                                                                                                                                                                    | Default / Example                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `DB__URL`          | Primary PostgreSQL connection URL (read-write). Injected from the CNPG-generated secret in Kubernetes.                                                                         | `postgresql://user:pass@host:5432/db`                 |
| `DB__READ_URL`     | Optional read-replica URL (e.g. CNPG's `-ro` service). Pure read queries (`findMany`, `findUnique`, `count`) are routed here, offloading the primary. Falls back to `DB__URL`. | `postgresql://user:pass@host-ro:5432/db` *(optional)* |
| `DB__POOL__MAX`    | Maximum connections in the primary (`db`) `pg.Pool` per API pod. Size for `(maxReplicas × pool.max) + BetterAuth + headroom < max_connections`.                                | `15`                                                  |
| `DB__POOL__RO_MAX` | Maximum connections in the read-replica (`dbRo`) pool per API pod. Can be higher than `DB__POOL__MAX` since replicas handle no write traffic.                                  | `25`                                                  |

### Server

| Variable                       | Description                                                                 | Default / Example |
| ------------------------------ | --------------------------------------------------------------------------- | ----------------- |
| `SERVER__HOST`                 | Server listen address                                                       | `127.0.0.1`       |
| `SERVER__PORT`                 | Server listen port                                                          | `8081`            |
| `SERVER__DOMAIN`               | Public host:port used in Swagger URLs                                       | `127.0.0.1:8081`  |
| `SERVER__BASE_PATH`            | Base path prefix for all routes (set to `""` on a dedicated API sub-domain) | `/api`            |
| `SERVER__RATE_LIMIT__MAX`      | Global Fastify rate-limit ceiling per IP per minute                         | `1000`            |
| `SERVER__RATE_LIMIT__AUTH_MAX` | Per-IP rate limit for routes under `/auth/*` per minute                     | `20`              |
| `SERVER__TRUST_PROXY`          | Trust `X-Forwarded-For` behind a reverse proxy — see below                  | `false`           |

**Set `SERVER__TRUST_PROXY` whenever the API runs behind an ingress, load balancer or CDN** — which is every Helm and Compose deployment in this repo. Both rate limiting and the audit log key off `request.ip`, and without it that resolves to the *proxy's* address: the per-IP limit becomes a single bucket shared by every client (so a handful of concurrent users can 429 each other off the login page), and every audit entry records the proxy as the origin.

Accepts `true`, a hop count (`1` = the one proxy in front of the API), or a comma-separated list of trusted addresses / CIDRs — `loopback`, `linklocal` and `uniquelocal` also work. Prefer a hop count or a list: a bare `true` trusts whatever the client puts in `X-Forwarded-For`, letting it forge its own address and poison the two things the setting exists to fix.

### Auth, OIDC & Bootstrap

| Variable                                | Description                                                                                                      | Default / Example                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `AUTH__SECRET`                          | 256-bit secret for session signing                                                                               | *(required in production)*               |
| `AUTH__BASE_URL`                        | Public API base URL                                                                                              | `http://localhost:8081`                  |
| `AUTH__TRUSTED_ORIGINS`                 | Comma-separated list of trusted CORS origins                                                                     | `http://localhost:3000`                  |
| `AUTH__REDIS__URL`                      | Standalone Redis URL for session secondary storage                                                               | `redis://redis:6379` *(optional)*        |
| `AUTH__REDIS__SENTINEL_URLS`            | Comma-separated `host:port` pairs for Sentinel mode — **takes precedence over `REDIS__URL`**                     | `redis:26379,redis-2:26379` *(optional)* |
| `AUTH__REDIS__SENTINEL_MASTER`          | Sentinel master name (required with `REDIS__SENTINEL_URLS`)                                                      | `mymaster`                               |
| `AUTH__REDIS__PASSWORD`                 | Redis node password for both standalone and Sentinel modes                                                       | *(optional)*                             |
| `AUTH__REDIS__SENTINEL_PASSWORD`        | Sentinel node password — falls back to `AUTH__REDIS__PASSWORD` when not set                                      | *(optional)*                             |
| `AUTH__RATE_LIMIT__ENABLED`             | Enable BetterAuth's per-IP rate limiter (separate from Fastify's). Disable for load testing.                     | `true`                                   |
| `AUTH__RATE_LIMIT__WINDOW`              | BetterAuth rate-limit window in seconds                                                                          | `10`                                     |
| `AUTH__RATE_LIMIT__MAX`                 | BetterAuth max requests per window per IP (defaults to `100`; built-in stricter rules apply to `/sign-in*` etc.) | `100`                                    |
| `AUTH__EMAIL_PASSWORD__ENABLED`         | Local email + password accounts — set `false` for an SSO-only instance, see below                                | `true`                                   |
| `OIDC__ENABLED`                         | Enable OIDC federation (e.g. Keycloak)                                                                           | `false`                                  |
| `OIDC__CLIENT_ID`                       | OIDC client ID                                                                                                   | `template-monorepo-ts`                   |
| `OIDC__CLIENT_SECRET`                   | OIDC client secret                                                                                               | —                                        |
| `OIDC__ISSUER`                          | OIDC realm issuer URL (internal, used for server-to-server calls)                                                | `http://keycloak:8080/realms/<realm>`    |
| `OIDC__PUBLIC_URL`                      | OIDC realm URL reachable by the browser (falls back to `OIDC__ISSUER` when empty)                                | —                                        |
| `OIDC__MAP_ROLES`                       | Sync OIDC realm roles → BetterAuth role                                                                          | `false`                                  |
| `OIDC__MAP_GROUPS`                      | Sync OIDC groups → BetterAuth role                                                                               | `false`                                  |
| `OIDC__MAP_ORG_ROLES`                   | Sync OIDC org roles → BetterAuth org member role                                                                 | `false`                                  |
| `OIDC__ORG_ROLE__PREFIX`                | Prefix used to extract org role from OIDC token claims                                                           | `org-`                                   |
| `OIDC__ORG_ROLE__DEFAULT`               | Default org member role when none is mapped                                                                      | `member`                                 |
| `BOOTSTRAP__EMAIL`                      | Bootstrap admin email                                                                                            | `admin@example.com` *(optional)*         |
| `BOOTSTRAP__PASSWORD`                   | Bootstrap admin password                                                                                         | *(optional)*                             |
| `MODULES__AUDIT__ENABLED`               | Enable the audit module                                                                                          | `false`                                  |
| `PLATFORM__APP_NAME`                    | Platform display name                                                                                            | `Template Monorepo TS`                   |
| `PLATFORM__DOCUMENTATION_URL`           | Documentation URL shown in Swagger `externalDocs`                                                                | —                                        |
| `PLATFORM__ENABLE_REGISTRATION`         | Allow new user self-registration                                                                                 | `true`                                   |
| `PLATFORM__ALLOW_ORGANIZATION_CREATION` | Allow users to create organizations                                                                              | `true`                                   |
| `PLATFORM__MAINTENANCE_MODE`            | Put the platform in maintenance mode (read-only)                                                                 | `false`                                  |
| `PLATFORM__MAX_ORGANIZATIONS_PER_USER`  | Maximum organizations a user can belong to (`null` = unlimited)                                                  | `null`                                   |
| `PLATFORM__MAX_PROJECTS_PER_ORG`        | Maximum projects per organization (`null` = unlimited)                                                           | `null`                                   |
| `PLATFORM__AUDIT_RETENTION_DAYS`        | Days to retain audit log entries (`0` = keep forever)                                                            | `0`                                      |

#### SSO-only instances

`PLATFORM__ENABLE_REGISTRATION=false` is **not** enough to make an instance SSO-only. It blocks `POST /sign-up/email` and hides the register link, but password sign-in stays open, so every account that already has one — including the bootstrap admin — keeps working, and the login page still leads with a credentials form.

`AUTH__EMAIL_PASSWORD__ENABLED=false` is the real switch. BetterAuth then rejects `sign-in/email` as well as `sign-up/email`, the login page drops the credentials form and offers only the configured providers, and `/register` redirects to `/login`.

It requires `OIDC__ENABLED=true`. Turning off passwords with no identity provider configured leaves no way in at all, so the server refuses to boot rather than coming up healthy with an unusable login page.

`BOOTSTRAP__EMAIL` still works and is still worth setting: it seeds the `admin` role, and because `keycloak` is a trusted provider for account linking, the first verified SSO sign-in with that address adopts the account. `BOOTSTRAP__PASSWORD` is hashed but can never be used — the server warns about it at startup.

### Observability

| Variable                      | Description                                               | Default                 |
| ----------------------------- | --------------------------------------------------------- | ----------------------- |
| `OTEL_SDK_DISABLED`           | Disable tracing and metrics entirely                      | `false`                 |
| `OTEL_SERVICE_NAME`           | Service name reported in traces and metrics               | `api`                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector OTLP/HTTP endpoint                              | `http://localhost:4318` |
| `OTEL_METRICS_PORT`           | Port of the Prometheus scrape endpoint exposed by the API | `9000`                  |

Unlike every other table on this page, these keep their **SDK-standard spelling**: no `__` prefix, no config-file section, no merging. The OpenTelemetry SDK reads its own environment, so any standard variable works — `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_TRACES_SAMPLER` and so on — not just the four the application reads itself. Re-spelling them as `OTEL__*` would break that and silently drop anything not explicitly re-mapped.

They are still listed read-only under **Settings > System > Runtime configuration**, grouped under `otel`, so "did my endpoint land?" is answered in the same place as for the rest of the boot tier. A value the SDK cannot use (a malformed `OTEL_METRICS_PORT`, say) is reported as `default` — the value the process is really running with — and logged at startup.

> *__Notes:__*
> - *OTel is automatically disabled in test environments (`NODE_ENV=test`).*
> - *`make dev` starts only Postgres and Redis, so the SDK exports into the void and still binds `OTEL_METRICS_PORT`. Set `OTEL_SDK_DISABLED=true` in `apps/api/.env`, or start the collector with `docker compose -f docker/docker-compose.dev.yml up otel-collector -d`.*
> - *Under Docker Compose, `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` are set in the compose file's `environment:` block, which takes precedence over `apps/api/.env.docker` — change them there.*
> - *Under Helm, `OTEL_METRICS_PORT` is derived from `api.metrics.service.targetPort` when `api.metrics.enabled` is true, so the port the API listens on cannot drift from the one the Service and ServiceMonitor target. Setting it explicitly in `api.env` still wins.*

### Logging

| Variable    | Description                                                                      | Default                                                        |
| ----------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `LOG_LEVEL` | Minimum log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`) | `silent` in test, `debug` in development, `info` in production |
| `NODE_ENV`  | Controls log format and default level                                            | `production`                                                   |

Logging is provided by the `@template-monorepo-ts/logger` package (Pino-based). In development, logs are pretty-printed; in production, they are JSON-formatted for machine consumption. OpenTelemetry trace context (`traceId`, `spanId`) is automatically injected into every log entry when a span is active.

### MCP Server

| Variable          | Description                                         | Default      |
| ----------------- | --------------------------------------------------- | ------------ |
| `TMTS_SERVER_URL` | Base URL of the API server                          | *(required)* |
| `TMTS_TOKEN`      | Bearer token for session-based auth                 | —            |
| `TMTS_API_KEY`    | API key for key-based auth                          | —            |
| `TMTS_TRANSPORT`  | Transport mode: `stdio` (local) or `http` (network) | `stdio`      |
| `TMTS_HTTP_HOST`  | HTTP listen host (only when `TMTS_TRANSPORT=http`)  | `0.0.0.0`    |
| `TMTS_HTTP_PORT`  | HTTP listen port (only when `TMTS_TRANSPORT=http`)  | `3100`       |

### Web

| Variable           | Scope         | Description                                           | Default                     |
| ------------------ | ------------- | ----------------------------------------------------- | --------------------------- |
| `VITE_API_URL`     | Dev (Vite)    | Browser-side API URL (include base path, e.g. `/api`) | `http://localhost:8081/api` |
| `VITE_APP_VERSION` | Dev (Vite)    | App version display in dev mode                       | `dev`                       |
| `API_PROXY_TARGET` | Dev (Vite)    | Vite proxy target for `/api` (Docker network address) | `http://localhost:8081`     |
| `API_URL`          | Prod (Docker) | API URL injected via envsubst (include base path)     | `http://api:8080/api`       |
| `APP_VERSION`      | Prod (Docker) | App version injected via envsubst (set by CI/CD)      | `dev`                       |

### Enterprise proxy

If the API server needs to reach external services (Keycloak, OAuth providers) through an HTTP proxy, set the standard proxy environment variables:

| Variable      | Description                                                               | Default |
| ------------- | ------------------------------------------------------------------------- | ------- |
| `HTTP_PROXY`  | Proxy URL for HTTP requests (e.g. `http://proxy.corp.example.com:3128`)   | —       |
| `HTTPS_PROXY` | Proxy URL for HTTPS requests (e.g. `http://proxy.corp.example.com:3128`)  | —       |
| `NO_PROXY`    | Comma-separated list of hosts/domains to bypass (e.g. `localhost,.local`) | —       |

Bun natively routes all `fetch()` calls (used by BetterAuth, Keycloak OIDC, and health probes) through the proxy. Internal TCP connections (PostgreSQL, Redis) and the OTel HTTP exporter (which targets a local collector) are unaffected.

**Docker Compose** — proxy variables are passed through from the host environment automatically (no value assignment needed).

**Kubernetes (Helm)** — set the variables under `global.env` in your values file:

```yaml
global:
  env:
    HTTP_PROXY: "http://proxy.corp.example.com:3128"
    HTTPS_PROXY: "http://proxy.corp.example.com:3128"
    NO_PROXY: "localhost,127.0.0.1,.cluster.local,.svc"
```
