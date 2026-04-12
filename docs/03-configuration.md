# Configuration

## Configuration system

A configuration management system enables type checking and automatic value merging in the following priority order (highest wins):

```txt
default variables → configuration file variables → environment variables
```

Environment variables are parsed to extract only keys with specific prefixes (improving security). Keys are split by `__` *(double underscore)* to reconstruct the nested configuration object. Arrays must be passed as JSON strings.

| Prefix       | Namespace  | Description                        |
| ------------ | ---------- | ---------------------------------- |
| `API__`      | `api`      | Server host, port, domain, version |
| `DB__`       | `db`       | Database connection URL            |
| `AUTH__`     | `auth`     | BetterAuth secret, base URL, Redis |
| `KEYCLOAK__` | `keycloak` | Keycloak OIDC federation settings  |
| `ADMIN__`    | `admin`    | Initial admin user credentials     |
| `MODULES__`  | `modules`  | Feature module toggles             |

**Configuration files:**

- Development: `apps/api/config-example.json`
- Production: `/app/config.json` (mounted at runtime)

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

| Method   | Path                     | Auth          | Description                               |
| -------- | ------------------------ | ------------- | ----------------------------------------- |
| `GET`    | `/api/v1/healthz`        | Public        | Startup probe                             |
| `GET`    | `/api/v1/readyz`         | Public        | Readiness probe (checks DB)               |
| `GET`    | `/api/v1/livez`          | Public        | Liveness probe                            |
| `GET`    | `/api/v1/version`        | Public        | Current API version                       |
| `ANY`    | `/api/v1/auth/*`         | Public / Auth | BetterAuth catch-all                      |
| `GET`    | `/api/v1/auth/reference` | Public        | Interactive OpenAPI reference (Scalar UI) |
| `GET`    | `/api/v1/projects`       | Authenticated | List own projects (admin: all projects)   |
| `GET`    | `/api/v1/projects/:id`   | Authenticated | Get own project by ID (admin: any)        |
| `POST`   | `/api/v1/projects`       | Authenticated | Create project (owner = current user)     |
| `PUT`    | `/api/v1/projects/:id`   | Authenticated | Update own project (admin: any)           |
| `DELETE` | `/api/v1/projects/:id`   | Authenticated | Delete own project (admin: any)           |
| `GET`    | `/api/v1/theme`          | Public        | Get platform theme configuration          |
| `PUT`    | `/api/v1/theme`          | Admin         | Update platform theme configuration       |
| `GET`    | `/api/v1/config`         | Public        | Get app configuration (e.g. registration) |
| `PUT`    | `/api/v1/config`         | Admin         | Update app configuration                  |

> **Ownership rules**: regular users can only read, update, or delete projects they own (`ownerId` matches their session user ID). Admins bypass ownership checks. The `ownerId` is set automatically from the session on creation — it is not a caller-supplied field.

## Environment variables

### Server

| Variable         | Description                                                                 | Default / Example |
| ---------------- | --------------------------------------------------------------------------- | ----------------- |
| `API__HOST`      | Server listen address                                                       | `127.0.0.1`       |
| `API__PORT`      | Server listen port                                                          | `8081`            |
| `API__DOMAIN`    | Public host:port used in Swagger URLs                                       | `127.0.0.1:8081`  |
| `API__VERSION`   | Version string returned by `/version`                                       | `dev`             |
| `API__BASE_PATH` | Base path prefix for all routes (set to `""` on a dedicated API sub-domain) | `/api`            |

### Auth & Keycloak

| Variable                        | Description                                                                                 | Default / Example                        |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `AUTH__SECRET`                  | 256-bit secret for session signing                                                          | *(required in production)*               |
| `AUTH__BASE_URL`                | Public API base URL                                                                         | `http://localhost:8081`                  |
| `AUTH__TRUSTED_ORIGINS`         | Comma-separated list of trusted CORS origins                                                | `http://localhost:3000`                  |
| `AUTH__REDIS_URL`               | Standalone Redis URL for session secondary storage                                          | `redis://redis:6379` *(optional)*        |
| `AUTH__REDIS_SENTINEL_URLS`     | Comma-separated `host:port` pairs for Sentinel mode — **takes precedence over `REDIS_URL`** | `redis:26379,redis-2:26379` *(optional)* |
| `AUTH__REDIS_SENTINEL_MASTER`   | Sentinel master name (required with `REDIS_SENTINEL_URLS`)                                  | `mymaster`                               |
| `AUTH__REDIS_PASSWORD`          | Redis node password for both standalone and Sentinel modes                                  | *(optional)*                             |
| `AUTH__REDIS_SENTINEL_PASSWORD` | Sentinel node password — falls back to `AUTH__REDIS_PASSWORD` when not set                  | *(optional)*                             |
| `KEYCLOAK__ENABLED`             | Enable Keycloak OIDC federation                                                             | `false`                                  |
| `KEYCLOAK__CLIENT_ID`           | Keycloak client ID                                                                          | `template-monorepo-ts`                   |
| `KEYCLOAK__CLIENT_SECRET`       | Keycloak client secret                                                                      | —                                        |
| `KEYCLOAK__ISSUER`              | Keycloak realm issuer URL (internal, used for server-to-server calls)                       | `http://keycloak:8080/realms/<realm>`    |
| `KEYCLOAK__PUBLIC_URL`          | Keycloak realm URL reachable by the browser (falls back to `KEYCLOAK__ISSUER` when empty)   | —                                        |
| `KEYCLOAK__MAP_ROLES`           | Sync Keycloak realm roles → BetterAuth role                                                 | `false`                                  |
| `KEYCLOAK__MAP_GROUPS`          | Sync Keycloak groups → BetterAuth role                                                      | `false`                                  |
| `ADMIN__EMAIL`                  | Bootstrap admin email                                                                       | `admin@example.com` *(optional)*         |
| `ADMIN__PASSWORD`               | Bootstrap admin password                                                                    | *(optional)*                             |

### Observability

| Variable                      | Description                                 | Default                      |
| ----------------------------- | ------------------------------------------- | ---------------------------- |
| `OTEL_SERVICE_NAME`           | Service name reported in traces and metrics | `api`                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel Collector OTLP endpoint                | `http://otel-collector:4318` |
| `OTEL_SDK_DISABLED`           | Disable the OTel SDK entirely               | `false`                      |

OTel is automatically disabled in test environments (`NODE_ENV=test`).

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

| Variable      | Description                                                                | Default |
| ------------- | -------------------------------------------------------------------------- | ------- |
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
