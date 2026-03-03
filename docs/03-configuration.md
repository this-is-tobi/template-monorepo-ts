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

> **Ownership rules**: regular users can only read, update, or delete projects they own (`ownerId` matches their session user ID). Admins bypass ownership checks. The `ownerId` is set automatically from the session on creation — it is not a caller-supplied field.

## Environment variables

### Auth & Keycloak

| Variable                  | Description                                  | Default / Example                     |
| ------------------------- | -------------------------------------------- | ------------------------------------- |
| `AUTH__SECRET`            | 256-bit secret for session signing           | *(required in production)*            |
| `AUTH__BASE_URL`          | Public API base URL                          | `http://localhost:8081`               |
| `AUTH__TRUSTED_ORIGINS`   | Comma-separated list of trusted CORS origins | `http://localhost:3000`               |
| `AUTH__REDIS_URL`         | Redis URL for session secondary storage      | `redis://redis:6379` *(optional)*     |
| `KEYCLOAK__ENABLED`       | Enable Keycloak OIDC federation              | `false`                               |
| `KEYCLOAK__CLIENT_ID`     | Keycloak client ID                           | `template-monorepo-ts`                |
| `KEYCLOAK__CLIENT_SECRET` | Keycloak client secret                       | —                                     |
| `KEYCLOAK__ISSUER`        | Keycloak realm issuer URL                    | `http://keycloak:8080/realms/<realm>` |
| `KEYCLOAK__MAP_ROLES`     | Sync Keycloak realm roles → BetterAuth role  | `false`                               |
| `KEYCLOAK__MAP_GROUPS`    | Sync Keycloak groups → BetterAuth role       | `false`                               |
| `ADMIN__EMAIL`            | Bootstrap admin email                        | `admin@example.com` *(optional)*      |
| `ADMIN__PASSWORD`         | Bootstrap admin password                     | *(optional)*                          |

### Observability

| Variable                      | Description                                 | Default                      |
| ----------------------------- | ------------------------------------------- | ---------------------------- |
| `OTEL_SERVICE_NAME`           | Service name reported in traces and metrics | `api`                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel Collector OTLP endpoint                | `http://otel-collector:4318` |
| `OTEL_SDK_DISABLED`           | Disable the OTel SDK entirely               | `false`                      |

OTel is automatically disabled in test environments (`NODE_ENV=test`).
