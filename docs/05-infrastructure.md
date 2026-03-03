# Infrastructure

## Shared packages

The `packages/` folder contains reusable libraries shared across applications:

| Package         | Description                                   |
| --------------- | --------------------------------------------- |
| `eslint-config` | Shared ESLint configuration                   |
| `ts-config`     | Shared TypeScript base configuration          |
| `test-utils`    | Testing utilities (mock factories, helpers)   |
| `shared`        | Zod schemas, API contracts, utility functions |
| `playwright`    | End-to-end browser tests                      |

> *__Architecture note:__* Organization management (CRUD, members, invitations) and access control (roles, permissions) are handled directly by BetterAuth's Organization plugin within the **auth module**. Domain-specific extensions (projects, quotas, custom resources) are meant to be added by the consuming application, not the template.

## Docker services

The `docker/` folder contains two compose files:

- `docker-compose.dev.yml` — development stack with hot-reload (`docker compose watch`)
- `docker-compose.prod.yml` — production-like stack with pre-built images

### Services

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

### Startup order (dev)

```txt
keycloak-db ──► keycloak ──► keycloak-init (exits 0)
db ──────────► migrate ──► api
redis ───────────────────► api
```

### Keycloak setup

Keycloak runs in `start-dev` mode backed by a dedicated PostgreSQL instance. On first boot, the realm export in `docker/keycloak/realm-export.json` is imported automatically (`--import-realm`). A `keycloak-init` service runs once after Keycloak becomes healthy and patches the master realm to disable the SSL requirement (`sslRequired=none`), which is required when running without TLS in development.

> *__Notes:__*
> - *This init-container pattern is the standard approach for Keycloak 26+ — there is no env var or CLI flag to control `sslRequired` on the master realm.*
> - *In production, Keycloak runs in `start --optimized` mode and TLS is expected to be terminated at the reverse proxy level.*

## Observability

The template includes a full observability stack based on [OpenTelemetry](https://opentelemetry.io/) for both traces and metrics.

### Architecture

```txt
API (OTel SDK) → OTel Collector → Prometheus (metrics)
                                → Tempo (traces)
                                → Grafana (dashboards)
```

- The API uses manual `NodeTracerProvider` and `MeterProvider` (replacing `NodeSDK` for Bun compatibility — Bun does not support `require` hooks, so auto-instrumentation is unavailable).
- [@fastify/otel](https://github.com/fastify/fastify-otel) provides HTTP request trace spans.
- [@prisma/instrumentation](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing) hooks into Prisma Client internals, producing `prisma:client:operation`, `prisma:client:db_query` and `prisma:client:serialize` spans.
- A custom `httpRequestDuration` histogram records request latency via a Fastify `onResponse` hook.
- The [OTel Collector](https://opentelemetry.io/docs/collector/) receives traces and metrics, generates Prometheus metrics from trace spans using the `spanmetrics` connector, and forwards traces to [Tempo](https://grafana.com/oss/tempo/).
- [Grafana](https://grafana.com/oss/grafana/) provides 3 pre-configured dashboards: **API Overview**, **Prisma / Database** and **Traces Explorer**.

> *__Notes:__*
> - *OTel configuration files are located in `docker/otel/`.*
> - *Grafana dashboards are provisioned from `docker/otel/grafana/dashboards/`.*
> - *For Kubernetes deployments, set the OTel environment variables in `helm/values.yaml` under the `api.envFrom` or `api.env` sections.*

## Tests

Unit tests are run using [Vitest](https://vitest.dev/), which is API-compatible with Jest but faster when working on top of Vite. Tests are co-located with source files (`*.spec.ts`).

End to end tests are powered by [Playwright](https://playwright.dev/) and managed in the `./packages/playwright` folder.

> *__Notes:__* Test execution may require some packages to be built first. Pipeline dependencies are described in the `turbo.json` file.

## Docs

Documentation is written in the `./apps/docs` folder using [VitePress](https://vitepress.dev/), a static site generator built on [Vite](https://vitejs.dev/) and [Vue](https://vuejs.org/) that parses `.md` files into a documentation website.

## CI/CD

Default [GitHub Actions](https://docs.github.com/en/actions) workflows are ready to use. The main CI workflow runs on pull requests:

| Description                                          | File                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Lint                                                 | [lint.yml](../.github/workflows/lint.yml)                                                                      |
| Unit tests *- (with optional code quality scan)* [1] | [tests-unit.yml](../.github/workflows/tests-unit.yml)                                                          |
| Build application images [2]                         | [build.yml](../.github/workflows/build.yml)                                                                    |
| End to end tests OR Deployment tests [3]             | [tests-e2e.yml](../.github/workflows/tests-e2e.yml) / [tests-deploy.yml](../.github/workflows/tests-deploy.yml) |
| Vulnerability scan [4]                               | [scan.yml](../.github/workflows/scan.yml)                                                                      |

> *__Notes:__*
> - [1] Runs code quality analysis using Sonarqube scanner, only if secrets `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY` are configured.
> - [2] Builds application images tagged `pr-<pr_number>` and pushes them to a registry.
> - [3] Runs e2e tests if changes occur on apps, dependencies or helm; otherwise runs deployment tests.
> - [4] Runs only if changes occur in `apps`, `packages` or `.github` folders and the base branch is `main` or `develop`.

The CD workflow ([cd.yml](../.github/workflows/cd.yml)) publishes releases using [Release-please-action](https://github.com/google-github-actions/release-please-action), which automatically parses Git history following [Conventional Commits](https://www.conventionalcommits.org/) to build changelogs and version numbers (see [Semantic Versioning](https://semver.org/)):

| Description                                                             | File                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| Create new release pull request / Create new git tag and github release | [release.yml](../.github/workflows/release.yml) |
| Build application images and push them to a registry                    | [build.yml](../.github/workflows/build.yml)     |

> *__Notes:__ Uncomment the `on: push` trigger in `cd.yml` to automatically create the new release PR on merge into the main branch.*

### Build

All Docker images are built in parallel using the [matrix/docker.json](../ci/matrix/docker.json) file. Options are available for multi-arch builds with or without QEMU *(see [build.yml](../.github/workflows/build.yml))*.

The CI builds three images from the matrix:

- `api` — production runtime (distroless, minimal)
- `api-migrate` — Prisma migration runner (used as init container in Kubernetes / dependency service in docker-compose)
- `docs` — documentation static site

### Cache

The template uses caching for Bun, Turbo and Docker to improve CI/CD speed. Cache is automatically deleted when the associated pull request is closed or merged *(see [cache.yml](../.github/workflows/cache.yml))*.

### Security

[Trivy](https://trivy.dev/) scans are performed on each PR and reports are uploaded to the GitHub Code Scanning tool using SARIF exports, with additional templates available in the `./ci/trivy` folder.

### Preview

Application preview can be enabled using the [ArgoCD PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request). When a pull request is tagged with the `preview` label, a preview deployment is created using images tagged `pr-<pr_number>`.

To activate this feature:

1. Create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) so ArgoCD can access the repository and receive webhooks.
2. Deploy an `ApplicationSet` based on [this template](../ci/preview/applicationset.yaml).
3. Create GitHub Actions environment variable templates: `API_TEMPLATE_URL` (`https://api.pr-<pr_number>.domain.com`) and `DOCS_TEMPLATE_URL` (`https://docs.pr-<pr_number>.domain.com`).

## Deployment

### Helm chart

An example Helm chart is provided in the `./helm` folder to facilitate Kubernetes deployment. Adding a new service requires:

1. **Copy the API templates folder:**
    ```sh
    cp -R ./helm/templates/api ./helm/templates/<service_name>
    ```
2. **Replace references in the new templates:**
    ```sh
    find ./helm/templates/<service_name> -type f -exec perl -pi -e 's|\.Values\.api|\.Values\.<service_name>|g' {} \;
    find ./helm/templates/<service_name> -type f -exec perl -pi -e 's|\.template\.api|\.template\.<service_name>|g' {} \;
    ```
3. **Copy and rename the helper functions** in `./helm/templates/_helpers.tpl`.
4. **Copy and rename the values block** in `./helm/values.yaml`.

> *__Notes:__ Consider moving the `./helm` directory to a dedicated repository to use it as a versioned Helm registry:*
> - *<https://helm.sh/docs/topics/chart_repository#github-pages-example>*
> - *<https://helm.sh/docs/howto/chart_releaser_action>*
> - *<https://github.com/this-is-tobi/helm-charts>*

## GitHub templates

GitHub community templates are already set up and only need to be updated for your project:

- [Issue templates](../.github/ISSUE_TEMPLATE)
- [Pull Request templates](../.github/PULL_REQUEST_TEMPLATE)
- [Security template](../.github/SECURITY.md)
- [Code of Conduct](../.github/CODE_OF_CONDUCT.md)
- [LICENSE](../LICENSE)
