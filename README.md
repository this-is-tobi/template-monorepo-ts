# Typescript monorepo template :camping:

This projects aims to provide an opinionated template structure for typescript monorepo with an API example structure.

## Prerequisites

The following softwares need to be install:
- [Bun](https://bun.sh/) *- all-in-one JavaScript runtime & toolkit designed for speed, complete with a bundler, test runner, and Node.js-compatible package manager.*
- [Docker](https://docker.com/) *- software platform that lets you rapidly build, test and deploy applications using containers.*
- [Helm](https://helm.sh/) (optional) *- package manager for Kubernetes.*
- [Kind](https://kind.sigs.k8s.io/) (optional) *- local Kubernetes clusters through Docker.*
- [Kubectl](https://github.com/kubernetes/kubectl) (optional) *- command-line tool to deploy and manage applications in Kubernetes.*

## Developer experience

The following tools are provided with the template:
- [Commitlint](https://github.com/conventional-changelog/commitlint) *- commit message linter.*
- [Eslint](https://eslint.org/) *- javascript linter.*
- [Husky](https://typicode.github.io/husky/) *- git hooks wrapper.*
- [Proto](https://moonrepo.dev/proto) *- javascript toolchain.*
- [Turbo](https://turbo.build/repo) *- repo building system with pipeline management.*

This model also includes recommendations for vscode settings and extensions *(see [.vscode/settings.json](.vscode/settings.json) and [.vscode/extensions.json](.vscode/extensions.json))*.

To get a better developer experience, install globally [Ni](https://github.com/antfu/ni), a Nodejs package manager wrapper:
```sh
bun install --global @antfu/ni
```

## Template

### API

The API example is built on top of [Fastify](https://fastify.dev/), a powerful api framework that handles hooks and provides numerous plugins, including the following already in use:
- [@fastify/cookie](https://github.com/fastify/fastify-cookie)
- [@fastify/cors](https://github.com/fastify/fastify-cors)
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
- [@fastify/otel](https://github.com/fastify/fastify-otel)
- [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)

The API is fully typed and controlled over [Zod](https://zod.dev/) schemas to improve data validation in such backends or frontends (thanks to the shared package that handle schemas and can be imported by any other apps or packages).

The API uses a custom type-safe routing system built on top of Zod schemas, providing full type safety for request/response validation and automatic OpenAPI documentation generation through Fastify's native swagger integration. This approach ensures complete type safety across the entire stack while using well-maintained, stable libraries.

> *__Notes:__*
> - *Swagger UI is available at `http(s)://<api_domain>/swagger-ui`. It shows two spec sources: **Application API** (Fastify routes) and **Auth API** (BetterAuth — select from the top-right dropdown). A standalone Scalar reference UI for auth is also available at `/api/v1/auth/reference`.*
> - *A function `getApiClient` that returns an apiClient (using fetch, but could be extended to use axios or others) is exported from the `shared package`, it is useful for other apps / packages that needs to consume the API.*

#### Configuration

A configuration management system enables type checking and automatic replacement of values in the following order: `default variables` → `configuration file variables` → `environment variables`.

Environment variables are parsed to extract only keys with the following prefixes (improving security). Keys are split by `__` *(double underscore)* to reconstruct the nested configuration object. Arrays must be passed as JSON strings.

| Prefix       | Namespace  | Description                        |
| ------------ | ---------- | ---------------------------------- |
| `API__`      | `api`      | Server host, port, domain, version |
| `DB__`       | `db`       | Database connection URL            |
| `AUTH__`     | `auth`     | BetterAuth secret, base URL, Redis |
| `KEYCLOAK__` | `keycloak` | Keycloak OIDC federation settings  |
| `ADMIN__`    | `admin`    | Initial admin user credentials     |
| `MODULES__`  | `modules`  | Feature module toggles             |

Configuration files:
- Development: `apps/api/config-example.json`
- Production: `/app/config.json` (mounted at runtime)

#### Database

[Prisma](https://www.prisma.io/) is used as an example ORM in the template, providing complete and simplified control of the database based on API code (migrations, simplified queries, etc.). The code base has been split as much as possible to allow easy migration to other ORMs such as [Drizzle](https://orm.drizzle.team/), [Mongoose](https://mongoosejs.com/) or others; to do this, simply replace the `prisma/` folder with the corresponding solution and update the `resources/**/queries.ts` files.

#### Endpoints

| Method   | Path                     | Auth          | Description                               |
| -------- | ------------------------ | ------------- | ----------------------------------------- |
| `GET`    | `/api/v1/healthz`        | Public        | Startup probe                             |
| `GET`    | `/api/v1/readyz`         | Public        | Readiness probe (checks DB)               |
| `GET`    | `/api/v1/livez`          | Public        | Liveness probe                            |
| `GET`    | `/api/v1/version`        | Public        | Current API version                       |
| `ANY`    | `/api/v1/auth/*`         | Public / Auth | BetterAuth catch-all                      |
| `GET`    | `/api/v1/auth/reference` | Public        | Interactive OpenAPI reference (Scalar UI) |
| `GET`    | `/api/v1/users`          | Authenticated | List users                                |
| `GET`    | `/api/v1/users/:id`      | Authenticated | Get user by ID                            |
| `POST`   | `/api/v1/users`          | Admin only    | Create user                               |
| `PUT`    | `/api/v1/users/:id`      | Authenticated | Update user                               |
| `DELETE` | `/api/v1/users/:id`      | Admin only    | Delete user                               |

### Module system

The API uses a **plug-and-play module system** that allows features to be enabled or disabled independently via environment variables. Each module is a self-contained unit that can register Fastify decorators and routes, bootstrap data after the database is ready, and release resources on graceful shutdown.

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

**Toggling modules:**

```sh
# Disable the auth module entirely (no-op decorators, no auth routes)
MODULES__AUTH=false

# Enable optional modules
MODULES__TENANT=true
MODULES__AUDIT=true
```

**Adding a new module:**
1. Create `apps/api/src/modules/<name>/index.ts` that exports a default `AppModule`.
2. Add a toggle entry (`config.modules.<name>`) to `ConfigSchema` in `config.ts`.
3. Import and register it inside `setupModules()` in `apps/api/src/modules/index.ts`.

#### Auth module

The auth module is built on top of [BetterAuth](https://www.better-auth.com/), a type-safe, batteries-included authentication library. It handles **authentication, organization management, and access control** — roles and permissions are managed via BetterAuth's organization plugin with typed access control definitions (see `access-control.ts`).

**Features:**

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

**Middleware:**

```ts
// Require a valid session (cookie or Bearer token)
{ preHandler: [app.requireAuth] }

// Require one of the listed roles (calls requireAuth internally)
{ preHandler: [app.requireRole('admin')] }
```

**Keycloak OIDC mapping:**

When Keycloak is enabled, users can authenticate via OIDC (SSO). Profile fields (`given_name`, `family_name`) are always mapped to `firstname` / `lastname`. Role and group mapping is **opt-in** via configuration:

| Mode                     | `MAP_ROLES` | `MAP_GROUPS` | Roles source                 | Use case                                           |
| ------------------------ | :---------: | :----------: | ---------------------------- | -------------------------------------------------- |
| **Integrated** (default) |   `false`   |   `false`    | BetterAuth admin plugin      | Public app with social IDPs — roles managed in-app |
| **Enterprise roles**     |   `true`    |   `false`    | Keycloak `realm_roles` claim | Corp Keycloak — realm roles synced on every login  |
| **Enterprise groups**    |   `false`   |    `true`    | Keycloak `groups` claim      | Corp Keycloak — groups used as roles               |
| **Full enterprise**      |   `true`    |    `true`    | Both (merged, deduplicated)  | Keycloak is the single source of truth             |

**Admin bootstrap:**

On first startup, if `ADMIN__EMAIL` and `ADMIN__PASSWORD` are set, a default admin user is created automatically. The operation is idempotent — it is safely skipped if the user already exists.

**Auth environment variables:**

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

#### Audit module

The audit module provides **structured audit logging** backed by a Prisma repository. It exposes an `auditLogger` on the Fastify instance.

**Enable:** `MODULES__AUDIT=true`

**Usage in route handlers:**

```ts
// Synchronous (awaits write)
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

### Shared packages

The `packages/` folder contains reusable libraries shared across applications:

| Package         | Description                                   |
| --------------- | --------------------------------------------- |
| `eslint-config` | Shared ESLint configuration                   |
| `ts-config`     | Shared TypeScript base configuration          |
| `test-utils`    | Testing utilities (mock factories, helpers)   |
| `shared`        | Zod schemas, API contracts, utility functions |
| `playwright`    | End-to-end browser tests                      |

> *__Architecture note:__* Organization management (CRUD, members, invitations) and access control (roles, permissions) are handled directly by BetterAuth's Organization plugin within the **auth module**. Domain-specific extensions (projects, quotas, custom resources) are meant to be added by the consuming application, not the template.

### Docker services

The `docker/` folder contains two compose files:

- `docker-compose.dev.yml` — development stack with hot-reload (`docker compose watch`)
- `docker-compose.prod.yml` — production-like stack with pre-built images

**Services:**

| Service          | Image                                      | Port (host) | Description                                                                  |
| ---------------- | ------------------------------------------ | :---------: | ---------------------------------------------------------------------------- |
| `api`            | `template-monorepo-ts/api`                 |    8081     | Fastify API (dev: watch mode, prod: bundled)                                 |
| `docs`           | `template-monorepo-ts/docs`                |    8082     | VitePress documentation site                                                 |
| `db`             | `postgres:17.9`                            |    5432     | Main application PostgreSQL database                                         |
| `redis`          | `redis:7.4-bookworm`                       |    6379     | Redis session store                                                          |
| `migrate`        | `template-monorepo-ts/api` (migrate stage) |      —      | One-shot Prisma migration runner                                             |
| `keycloak-db`    | `postgres:17.9`                            |      —      | Dedicated Keycloak PostgreSQL database                                       |
| `keycloak`       | `keycloak/keycloak:26.5.4`                 |    8084     | Keycloak identity provider                                                   |
| `keycloak-init`  | `keycloak/keycloak:26.5.4`                 |      —      | One-shot init container: sets master realm `sslRequired=none` via `kcadm.sh` |
| `otel-collector` | `otel/opentelemetry-collector-contrib`     | 4317, 4318  | OTel Collector (OTLP gRPC + HTTP)                                            |
| `tempo`          | `grafana/tempo:2.10.1`                     |      —      | Distributed tracing backend                                                  |
| `prometheus`     | `prom/prometheus:3.10.0`                   |    9090     | Metrics storage and query                                                    |
| `grafana`        | `grafana/grafana:12.4.0`                   |    8083     | Observability dashboards                                                     |

**Startup order (dev):**
```txt
keycloak-db ──► keycloak ──► keycloak-init (exits 0)
db ──────────► migrate ──► api
redis ───────────────────► api
```

**Keycloak setup:**

Keycloak runs in `start-dev` mode backed by a dedicated PostgreSQL instance. On first boot, the realm export in `docker/keycloak/realm-export.json` is imported automatically (`--import-realm`). A `keycloak-init` service runs once after Keycloak becomes healthy and patches the master realm to disable the SSL requirement (`sslRequired=none`), which is required when running without TLS in development.

> *__Notes:__*
> - *This init-container pattern is the standard approach for Keycloak 26+ — there is no env var or CLI flag to control `sslRequired` on the master realm.*
> - *In production, Keycloak runs in `start --optimized` mode and TLS is expected to be terminated at the reverse proxy level.*

### Observability

The template includes a full observability stack based on [OpenTelemetry](https://opentelemetry.io/) for both traces and metrics.

**Architecture:**

```txt
API (OTel SDK) → OTel Collector → Prometheus (metrics)
                                → Tempo (traces)
                                → Grafana (dashboards)
```

- The API uses manual `NodeTracerProvider` and `MeterProvider` (replacing `NodeSDK` for Bun compatibility — Bun doesn't support `require` hooks, so auto-instrumentation isn't available).
- [@fastify/otel](https://github.com/fastify/fastify-otel) provides HTTP request trace spans.
- [@prisma/instrumentation](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing) hooks into Prisma Client internals (not `require` hooks), producing `prisma:client:operation`, `prisma:client:db_query` and `prisma:client:serialize` spans.
- A custom `httpRequestDuration` histogram records request latency via a Fastify `onResponse` hook.
- The [OTel Collector](https://opentelemetry.io/docs/collector/) receives traces and metrics, generates Prometheus metrics from trace spans using the `spanmetrics` connector, and forwards traces to [Tempo](https://grafana.com/oss/tempo/).
- [Grafana](https://grafana.com/oss/grafana/) provides 3 pre-configured dashboards: **API Overview**, **Prisma / Database** and **Traces Explorer**.

**OTel environment variables:**

| Variable                      | Description                                 | Default                      |
| ----------------------------- | ------------------------------------------- | ---------------------------- |
| `OTEL_SERVICE_NAME`           | Service name reported in traces and metrics | `api`                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel Collector OTLP endpoint                | `http://otel-collector:4318` |
| `OTEL_SDK_DISABLED`           | Disable the OTel SDK entirely               | `false`                      |

OTel is automatically disabled in test environments (`NODE_ENV=test`).

> *__Notes:__*
> - *OTel configuration files are located in `docker/otel/`.*
> - *Grafana dashboards are provisioned from `docker/otel/grafana/dashboards/`.*
> - *For Kubernetes deployments, set the OTel environment variables in `helm/values.yaml` under the `api.envFrom` or `api.env` sections.*

### Tests

Unit tests are run using [Vitest](https://vitest.dev/), which is compatible with the Jest api but is faster when working on top of Vite.

End to end tests are powered by [Playwright](https://playwright.dev/) and could be managed in the `./packages/playwright` folder.

> *__Notes:__* Test execution may require some packages to be built, and the pipeline dependencies are described in the `turbo.json` file.

### Docs

Documentation is ready to write in the `./apps/docs` folder, it uses [Vitepress](https://vitepress.dev/), a static website generator using [Vite](https://vitejs.dev/) and [Vue](https://vuejs.org/) that will parse `.md` files to generate the documentation website.

### CI/CD

Default [Github Actions](https://docs.github.com/en/actions) workflows are already set to run some automated checks over 2 main files, the first one [ci.yml](./.github/workflows/ci.yml) run on pull request with the following tasks :

| Description                                          | File                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Lint                                                 | [lint.yml](./.github/workflows/lint.yml)                                                                      |
| Unit tests *- (With optional code quality scan)* [1] | [tests-unit.yml](./.github/workflows/tests-unit.yml)                                                          |
| Build application images [2]                         | [build.yml](./.github/workflows/build.yml)                                                                    |
| End to end tests OR Deployment tests [3]             | [tests-e2e.yml](./.github/workflows/tests-e2e.yml) / [tests-deploy.yml](./.github/workflows/tests-deploy.yml) |
| Vulnerability scan [4]                               | [scan.yml](./.github/workflows/scan.yml)                                                                      |

> *__Notes:__*
> - [1] Run code quality analysis using Sonarqube scanner, it only run if the secrets `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY` are set in the repositry interface.
>
> - [2] Build application images and tag them `pr-<pr_number>` before pushing them to a registry.
>
> - [3] Run e2e tests if changes occurs on apps, dependencies or helm / Run deployment tests if changes don't occurs in apps, dependencies or helm.
>
> - [4] Run only if changes occurs in `apps`, `packages` or `.github` folders and base branch is `main` or `develop`.

The second file [cd.yml](./.github/workflows/cd.yml) is responsible to publish new release using [Release-please-action](https://github.com/google-github-actions/release-please-action) that automatically parse git history following [Conventionnal Commit](https://www.conventionalcommits.org/) to build changelog and version number (see. [Semantic versioning](https://semver.org/lang/fr/)). It can be triggered manually to run the following tasks :

| Description                                                             | File                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| Create new release pull request / Create new git tag and github release | [release.yml](./.github/workflows/release.yml) |
| Build application images and push them to a registry                    | [build.yml](./.github/workflows/build.yml)     |

> *__Notes:__ Uncomment on push trigger in `cd.yml` file to automatically create the new PR on merge into the main branch.*

#### Build

All docker images are built in parallel using the [matrix/docker.json](./ci/matrix/docker.json) file, some options are available to build multi-arch with or whithout QEMU *(see. [build.yml](./.github/workflows/build.yml))*.

The CI builds three images from the matrix:
- `api` — production runtime (distroless, minimal)
- `api-migrate` — Prisma migration runner (used as init container in Kubernetes / dependency service in docker-compose)
- `docs` — documentation static site

#### Cache

This template uses cache for Bun, Turbo and docker to improve CI/CD speed when it is possible. The cache is deleted when the associated pull request is closed or merged *(see. [cache.yml](./.github/workflows/cache.yml))*.

#### Security

[Trivy](https://trivy.dev/) scans are performed on each PR and reports are uploaded to the Github Code Scanning Tool using SARIF exports, with some additional templates available in the `./ci/trivy` folder.

#### Preview

Application preview can be enabled using the [Argo-cd PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request), whenever a pull request is tagged with the `preview` label, a preview of the application's current state *(using images tagged  `pr-<pr_number>`)* will be deployed in a Kubernetes cluster.
To activate this feature, you need to :
- Create a [Github App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) to ensure Argo-cd will access to the repository and receive webhooks.
- Deploy an ApplicationSet based on [this template](./ci/preview/applicationset.yaml).
- Create Github Actions environment variables templates. Following the base template you should create 2 variables, one called `API_TEMPLATE_URL` with the value `https://api.pr-<pr_number>.domain.com` and the other called  `DOCS_TEMPLATE_URL` with the value `https://docs.pr-<pr_number>.domain.com`.

### Deployment

An example of a Helm structure is provided in the `./helm` folder to facilitate deployment in a Kubernetes cluster.
This type of structure makes it easy to add another service with little effort by adding a new service folder in `./helm/templates`, add helpers functions in [_helpers.tpl](./helm/templates/_helpers.tpl) and add a service block in [values.yaml](./helm/values.yaml). Example :
1. *Copy `./helm/templates/api` folder to `./helm/templates/<service_name>`.*
    ```sh
    cp -R ./helm/templates/api ./helm/templates/<service_name>
    ```
2. *Inside the newly created files `./helm/templates/<service_name>/*`, replace all `.Values.api` with `.Values.<service_name>` and `template.api` with `template.<service_name>`.*
    ```sh
    find ./helm/templates/<service_name> -type f -exec perl -pi -e 's|\.Values\.api|\.Values\.<service_name>|g' {} \;
    find ./helm/templates/<service_name> -type f -exec perl -pi -e 's|\.template\.api|\.template\.<service_name>|g' {} \;
    ```
3. *Copy - paste all `template.api.*` functions in `./helm/templates/_helpers.tpl` and rename them to `template.<service_name>`.*
4. *Copy - paste the `api` block in `./helm/values.yaml` and rename it to `<service_name>`.*

Another improvement that should be made is to put the `./helm` directory in a dedicated repository so that it can be used as a Helm registry with version control, see :
- <https://helm.sh/docs/topics/chart_repository#github-pages-example>
- <https://helm.sh/docs/howto/chart_releaser_action>
- <https://github.com/this-is-tobi/helm-charts>

### Github templates

Github templates are already define with a base structure that just need to be updated, see :
- [Issue templates](./.github/ISSUE_TEMPLATE)
- [Pull Request templates](./.github/PULL_REQUEST_TEMPLATE)
- [Security template](./.github/SECURITY.md)
- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [LICENSE](./LICENSE)

## Code structure

### Applications

Structure used for typescript applications :

```sh
./
├── apps
│   ├── api
│   └── docs
├── packages
│   ├── eslint-config
│   ├── playwright
│   ├── shared
│   ├── test-utils
│   └── ts-config
├── bun.lock
├── Makefile
└── package.json
```

### API

Structure used in the API example :

```sh
./apps/api
├── prisma
│   ├── schema.prisma           # Main config (generator, datasource)
│   ├── auth.prisma             # BetterAuth models (user, session, account, org, member, invitation, apiKey, jwks)
│   ├── audit.prisma            # Audit models (audit log)
│   └── migrations
├── src
│   ├── modules
│   │   ├── auth
│   │   │   ├── access-control.ts # Typed access control definitions (roles & resources)
│   │   │   ├── auth.ts          # BetterAuth instance (providers, plugins)
│   │   │   ├── bootstrap.ts     # Admin user bootstrap on first startup
│   │   │   ├── headers.ts       # Auth header helpers
│   │   │   ├── middleware.ts    # requireAuth / requireRole decorators
│   │   │   ├── router.ts        # /api/v1/auth/* catch-all route
│   │   │   └── index.ts         # AppModule definition
│   │   ├── index.ts             # Module loader (setupModules)
│   │   └── types.ts             # AppModule interface + Fastify type augmentation
│   ├── prisma
│   ├── resources
│   │   ├── system
│   │   │   ├── index.ts
│   │   │   └── router.ts        # /healthz, /readyz, /livez, /version
│   │   └── users
│   │       ├── business.ts
│   │       ├── index.ts
│   │       ├── queries.ts
│   │       └── router.ts
│   ├── utils
│   │   ├── config.ts
│   │   ├── controller.ts
│   │   └── otel.ts
│   ├── app.ts
│   ├── database.ts
│   └── server.ts
├── Dockerfile
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── vitest.config.ts
```

### Helm

Structure used for helm deployment :

```sh
./helm
├── charts
├── templates
│   ├── api
│   │   ├── clusterrole.yaml
│   │   ├── clusterrolebinding.yaml
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── grpcroute.yaml
│   │   ├── hpa.yaml
│   │   ├── httproute.yaml
│   │   ├── ingress.yaml
│   │   ├── metrics.yaml
│   │   ├── networkpolicy.yaml
│   │   ├── pdb.yaml
│   │   ├── pullsecret.yml
│   │   ├── role.yaml
│   │   ├── rolebinding.yaml
│   │   ├── secret.yaml
│   │   ├── service.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── servicemonitor.yaml
│   │   └── statefulset.yaml
│   ├── docs
│   │   └── ... (same structure as api)
│   ├── _helpers.tpl
│   ├── extra-objects.yaml
│   ├── gateway.yaml
│   ├── httproute.yaml
│   └── ingress.yaml
├── Chart.yaml
└── values.yaml
```

## Quickstart

```sh
# Clone this template
bunx degit https://github.com/this-is-tobi/template-monorepo-ts <project_name>

# Go to project directory
cd <project_name>

# Init git on the new project
git init

# Init example files
sh ./ci/scripts/init-env.sh

# Install dependencies
bun install

# Build packages
make build
```

## Commands

A bunch of commands are available through the [Makefile](Makefile). Run `make help` to list all available targets.

__Setup :__

```sh
# Prepare git hooks (husky)
make prepare

# Build all packages and apps
make build

# Remove build artifacts and node_modules
make clean
```

__Development :__

```sh
# Start development mode (db + turbo dev)
make dev

# Lint the code
make lint

# Format the code
make format
```

__Database :__

```sh
# Generate Prisma database client
make db-generate

# Deploy Prisma migrations to database
make db-deploy

# Run Prisma migrations in dev mode
make db-migrate

# Reset database and run migrations
make db-reset
```

__Testing :__

```sh
# Run all unit tests
make test

# Run unit tests with coverage
make test-cov

# Run full validation suite (lint, tests, builds)
make validate

# Run end to end tests - this requires `make dev` to be run in another terminal
make test-e2e
```

__Docker :__

```sh
# Start dev containers with watch mode
make docker-dev-up

# Start prod containers
make docker-prod-up

# Run e2e tests in dev containers
make docker-e2e

# Run e2e tests in prod containers (CI)
make docker-e2e-ci

# Stop dev or prod containers
make docker-dev-down
make docker-prod-down

# Stop and delete dev or prod containers and volumes
make docker-dev-clean
make docker-prod-clean
```

__Kubernetes :__

```sh
# Initialize local Kubernetes cluster with kind
make kube-init

# Full dev workflow for Kubernetes (build + deploy)
make kube-dev

# Full prod workflow for Kubernetes (build + deploy)
make kube-prod

# Remove Kubernetes application resources
make kube-down

# Delete Kubernetes cluster
make kube-clean

# Run e2e tests in Kubernetes
make kube-e2e
```

> *__Notes:__ Lower-level `bun run` scripts are still available in [package.json](package.json) and can target a specific workspace (ex: `bun run --cwd <package_path> <script_name>`).*

## Access

| Application     | URL (local / docker)             | URL (kubernetes)                   |
| --------------- | -------------------------------- | ---------------------------------- |
| API             | http://localhost:8081            | http://api.domain.local            |
| API *- swagger* | http://localhost:8081/swagger-ui | http://api.domain.local/swagger-ui |
| Documentation   | http://localhost:8082            | http://doc.domain.local            |
| Grafana         | http://localhost:8083            | -                                  |
| Keycloak        | http://localhost:8084            | -                                  |
| Prometheus      | http://localhost:9090            | -                                  |

> *__Notes:__ If the containers are healthy but the services are not resolved with Kubernetes, check that the domains are mapped to `127.0.0.1` in `/etc/hosts`, which is what Bun should do by running the `kube:init` command.*
