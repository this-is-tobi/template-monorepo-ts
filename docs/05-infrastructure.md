# Infrastructure

## Shared packages

The `packages/` folder contains reusable libraries shared across applications:

| Package         | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `cli`           | `tmts` CLI — API client with cross-platform native build         |
| `mcp`           | MCP server — expose API tools to LLMs via stdio & HTTP transport |
| `eslint-config` | Shared ESLint configuration                                      |
| `ts-config`     | Shared TypeScript base configuration                             |
| `test-utils`    | Testing utilities (mock factories, helpers)                      |
| `shared`        | Zod schemas, API contracts, utility functions                    |
| `playwright`    | End-to-end browser tests                                         |

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
db ───────────► migrate ───► api
redis ─────────────────────► api
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

### Docker Compose endpoints

| Component      | Internal hostname |           Port           |
| -------------- | ----------------- | :----------------------: |
| OTel Collector | `otel-collector`  | 4317 (gRPC), 4318 (HTTP) |
| Tempo          | `tempo`           |           3200           |
| Prometheus     | `prometheus`      |           9090           |
| Grafana        | `grafana`         |   3000 → host **8083**   |

### Kubernetes endpoints

When deployed via the Helm chart, internal service DNS names are stabilised with `fullnameOverride`:

| Component      | K8s service name                          |           Port           |
| -------------- | ----------------------------------------- | :----------------------: |
| OTel Collector | `opentelemetry-collector`                 | 4317 (gRPC), 4318 (HTTP) |
| Tempo          | `tempo`                                   |           3200           |
| Prometheus     | auto-provisioned by kube-prometheus-stack |           9090           |
| Grafana        | auto-provisioned by kube-prometheus-stack |            80            |

Set the following environment variable in the API deployment (via `api.env` or `api.envSecret` in `helm/values.yaml`):

```txt
OTEL_EXPORTER_OTLP_ENDPOINT=http://opentelemetry-collector:4318
```

### Grafana datasources & dashboards

In Docker Compose, datasources and dashboards are mounted from `docker/otel/grafana/`.

In Kubernetes, the Helm chart:
- Provisions the **Prometheus** datasource automatically via kube-prometheus-stack (uid: `prometheus`).
- Provisions the **Tempo** datasource via `kube-prometheus-stack.grafana.additionalDataSources` (uid: `tempo`).
- Creates **dashboard ConfigMaps** from `helm/files/dashboards/` (mirroring `docker/otel/grafana/dashboards/`). The kube-prometheus-stack Grafana sidecar picks up any ConfigMap labelled `grafana_dashboard: "1"` automatically.

> *Keep `helm/files/dashboards/` and `docker/otel/grafana/dashboards/` in sync when modifying dashboards.*

> *__Notes:__*
> - *OTel configuration files are located in `docker/otel/`.*
> - *Grafana dashboards are provisioned from `docker/otel/grafana/dashboards/` (Docker) and `helm/files/dashboards/` (Kubernetes).*

## Tests

Unit tests are run using [Vitest](https://vitest.dev/), which is API-compatible with Jest but faster when working on top of Vite. Tests are co-located with source files (`*.spec.ts`).

End to end tests are powered by [Playwright](https://playwright.dev/) and managed in the `./packages/playwright` folder.

> *__Notes:__* Test execution may require some packages to be built first. Pipeline dependencies are described in the `turbo.json` file.

## Docs

Documentation is written in the `./apps/docs` folder using [VitePress](https://vitepress.dev/), a static site generator built on [Vite](https://vitejs.dev/) and [Vue](https://vuejs.org/) that parses `.md` files into a documentation website.

## CI/CD

The CI/CD pipelines use [reusable workflows](https://github.com/this-is-tobi/github-workflows/tree/v0) from [`this-is-tobi/github-workflows@v0`](https://github.com/this-is-tobi/github-workflows). The orchestrators ([ci.yml](../.github/workflows/ci.yml), [cd.yml](../.github/workflows/cd.yml)) call these reusable workflows; the only local workflow is [release-cli.yml](../.github/workflows/release-cli.yml) which handles project-specific CLI binary compilation.

### CI pipeline

The main CI workflow ([ci.yml](../.github/workflows/ci.yml)) runs on pull requests:

| Step                                     | Workflow / Source                                                                                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint JS/TS code                          | [`lint-js.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/lint-js.yml) (reusable)                                                                                                                                                        |
| Unit tests with coverage                 | [`test-vitest.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/test-vitest.yml) (reusable)                                                                                                                                                |
| SonarQube code quality scan [1]          | [`scan-sonarqube.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/scan-sonarqube.yml) (reusable)                                                                                                                                          |
| Build Docker images [2]                  | [`build-docker.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/build-docker.yml) (reusable)                                                                                                                                              |
| Label PR on build                        | [`label-pr.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/label-pr.yml) (reusable)                                                                                                                                                      |
| End to end tests OR Deployment tests [3] | [`test-playwright.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/test-playwright.yml) / [`test-kube-deployment.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/test-kube-deployment.yml) (reusable) |
| Trivy vulnerability scan (images) [4]    | [`scan-trivy.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/scan-trivy.yml) (reusable)                                                                                                                                                  |
| Trivy vulnerability scan (config) [4]    | [`scan-trivy.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/scan-trivy.yml) (reusable)                                                                                                                                                  |

> *__Notes:__*
> - [1] Runs code quality analysis using SonarQube scanner. Requires secrets `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`. The job uses `continue-on-error` and is skipped gracefully when secrets are not configured.
> - [2] Builds application images tagged `pr-<pr_number>` and pushes them to GHCR. Each image is built in its own matrix slot via the reusable `build-docker.yml`. Includes SLSA provenance and SBOM attestation (requires `id-token: write` and `attestations: write` permissions).
> - [3] Runs e2e tests if changes occur in apps, packages or workflows; otherwise runs deployment tests. Uses reusable workflows: `test-playwright.yml` for Playwright browser tests and `test-kube-deployment.yml` for Kind-based Kubernetes deploy checks.
> - [4] Runs only if the base branch is `main` or `develop`. SARIF results are uploaded to the GitHub Security tab.

### CD pipeline

The CD workflow ([cd.yml](../.github/workflows/cd.yml)) publishes releases using [Release-please-action](https://github.com/google-github-actions/release-please-action), which automatically parses Git history following [Conventional Commits](https://www.conventionalcommits.org/) to build changelogs and version numbers (see [Semantic Versioning](https://semver.org/)):

| Step                            | Workflow / Source                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Build CLI binaries [7]          | [release-cli.yml](../.github/workflows/release-cli.yml) (local)                                                                           |
| Create release (release-please) | [`release-app.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/release-app.yml) (reusable)             |
| Build Docker images             | [`build-docker.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/build-docker.yml) (reusable)           |
| Publish CLI to NPM              | [`release-npm.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/release-npm.yml) (reusable)             |
| Bump Helm chart appVersion [6]  | [`update-helm-chart.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/update-helm-chart.yml) (reusable) |
| Publish Helm chart to OCI [5]   | [`release-helm.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/release-helm.yml) (reusable)           |

> *__Notes:__*
> - *Uncomment the `on: push` trigger in `cd.yml` to automatically create the new release PR on merge into the main branch.*
> - *Release-please automatically updates `packages/cli/package.json` version via `extra-files` to keep it in sync with the app version.*
> - *[5] `release-helm` runs after `update-helm-chart` completes. It uses chart-releaser to detect charts whose version tag doesn't exist yet and publishes them to GHCR as OCI artifacts.*
> - *[6] `update-helm-chart` runs only on app release. It bumps the chart's `appVersion` to the new app version, independently increments the chart `version` (patch bump), regenerates docs, and creates a PR. When that PR is merged, the next CD run picks it up via `release-helm`. The chart version is **independent** from the app version — the chart can also be bumped without an app release.*
> - *[7] `build-cli` runs unconditionally before the release step. It compiles cross-platform CLI binaries, generates SHA-256 checksums, and uploads them as a consolidated artifact (`cli-release-assets`). When a release is created, `release-app.yml` automatically attaches these assets to the GitHub release.*
> - *Requires secrets: `NPM_TOKEN` for NPM publishing, `GH_PAT` for release auto-merge.*

### Other workflows

| Workflow                                        | Source | Description                                                                                                                                                                                  |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [cache.yml](../.github/workflows/cache.yml)     | local  | Cleans GitHub Actions cache and optionally GHCR images on PR close (uses [`clean-cache.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/clean-cache.yml)) |
| [preview.yml](../.github/workflows/preview.yml) | local  | Posts preview environment links as PR comment (uses [`preview-comment.yml@v0`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/preview-comment.yml))              |

### Build

Docker images are built using the reusable [`build-docker.yml`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/build-docker.yml) workflow, once per image via a `strategy.matrix`:

- `api` — production runtime (distroless, minimal)
- `api-migrate` — Prisma migration runner (used as init container in Kubernetes / dependency service in docker-compose)
- `docs` — documentation static site
- `cli` — CLI binary Docker image

### Cache

GitHub Actions cache is automatically deleted when the associated pull request is closed or merged. Optionally, GHCR images can be deleted by setting the repository variable `CLEAN_IMAGES=true` or using the manual dispatch input.

### Security

[Trivy](https://trivy.dev/) scans are performed on each PR via the reusable [`scan-trivy.yml`](https://github.com/this-is-tobi/github-workflows/blob/v0/.github/workflows/scan-trivy.yml). Image scans and config scans run as separate jobs. SARIF reports are uploaded to the GitHub Security tab.

### Preview

Application preview can be enabled using the [ArgoCD PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request). When a pull request is tagged with the `preview` label, a preview deployment is created using images tagged `pr-<pr_number>`.

To activate this feature:

1. Create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) so ArgoCD can access the repository and receive webhooks.
2. Deploy an `ApplicationSet` based on [this template](../ci/preview/applicationset.yaml).
3. Create GitHub Actions environment variable templates: `API_TEMPLATE_URL` (`https://api.pr-<pr_number>.domain.com`) and `DOCS_TEMPLATE_URL` (`https://docs.pr-<pr_number>.domain.com`).

### Using workflows locally

If you prefer to have all workflow definitions in your repository rather than referencing the external reusable workflows, you can copy them locally:

```sh
# Clone the reusable workflows at the pinned version
git clone --branch v0 --depth 1 https://github.com/this-is-tobi/github-workflows.git /tmp/github-workflows

# Copy the specific workflows used by this project
for wf in build-docker lint-js test-vitest test-playwright test-kube-deployment scan-trivy scan-sonarqube clean-cache label-pr preview-comment release-app release-npm release-helm update-helm-chart; do
  cp "/tmp/github-workflows/.github/workflows/${wf}.yml" ./.github/workflows/
done

# Clean up
rm -rf /tmp/github-workflows
```

Then update the `uses:` references in `ci.yml`, `cd.yml` and `cache.yml` from:

```yaml
uses: this-is-tobi/github-workflows/.github/workflows/<workflow>.yml@v0
```

to:

```yaml
uses: ./.github/workflows/<workflow>.yml
```

> *__Notes:__*
> - *When using local copies, you are responsible for pulling upstream updates yourself.*
> - *The reusable workflows are versioned — pinning `@v0` ensures stability. Check the [releases page](https://github.com/this-is-tobi/github-workflows/releases) for updates.*

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
