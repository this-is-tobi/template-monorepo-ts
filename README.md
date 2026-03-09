# Typescript monorepo template :camping:

Opinionated TypeScript monorepo template built with **Bun + Fastify + Prisma + BetterAuth**.

It ships a working API example with authentication, an optional audit module, and full observability — ready to be used as a foundation for SaaS and on-premise applications.

## Features

- **Authentication** — email/password, bearer tokens, 2FA, API keys, JWT/JWKS, Keycloak OIDC SSO
- **Organisation management** — multi-tenant orgs, members, invitations, role-based access (owner / admin / member)
- **Audit logging** — structured audit trail backed by Prisma, opt-in via `MODULES__AUDIT=true`
- **Observability** — OpenTelemetry traces + metrics → OTel Collector → Prometheus, Tempo, Grafana
- **Plug-and-play modules** — every feature is toggled via env vars and follows the `AppModule` interface
- **Swagger / OpenAPI** — dual-spec UI (Fastify routes + BetterAuth), Scalar reference for auth
- **MCP server** — expose API tools to LLMs via Model Context Protocol (stdio & HTTP transport)
- **Kubernetes-native** — production Helm chart, Gateway API, Kind for local dev, ArgoCD preview
- **CI/CD ready** — GitHub Actions: lint, unit tests, image builds, e2e, Trivy security scans, release-please

## Tech stack

| Layer         | Tool           | Notes                                                            |
| ------------- | -------------- | ---------------------------------------------------------------- |
| Runtime       | Bun            | Package manager, bundler, test runner                            |
| API           | Fastify        | Plugins: cookie, cors, helmet, otel, swagger                     |
| Auth          | BetterAuth     | bearer, admin, 2FA, openAPI, jwt, organization, apiKey, keycloak |
| ORM           | Prisma         | Multi-file schema (`prisma/*.prisma`), PostgreSQL                |
| Validation    | Zod            | Single source of truth for API contracts                         |
| Observability | OpenTelemetry  | Collector → Prometheus + Tempo + Grafana                         |
| CI/CD         | GitHub Actions | Turbo cache, Docker matrix builds, Trivy scans                   |
| Deploy        | Helm + K8s     | Gateway API, Kind for local, ArgoCD preview                      |

## Prerequisites

- [Bun](https://bun.sh/) — runtime, package manager, test runner
- [Docker](https://docker.com/) — local services (DB, Redis, Keycloak, observability stack)
- [Helm](https://helm.sh/) *(optional)* — Kubernetes package manager
- [Kind](https://kind.sigs.k8s.io/) *(optional)* — local Kubernetes clusters via Docker
- [Kubectl](https://github.com/kubernetes/kubectl) *(optional)* — Kubernetes CLI

## Quickstart

```sh
# Clone this template
bunx degit https://github.com/this-is-tobi/template-monorepo-ts <project_name>

# Go to project directory
cd <project_name>

# Init git on the new project
git init

# Initialize environment variables
sh ./ci/scripts/init-env.sh

# Install dependencies
bun install

# Compile types
make compile

# Build packages
make build
```

## Commands

A full set of commands is available via `make help`. Key targets:

```sh
make dev              # Start development mode (DB + turbo dev)
make test             # Run unit tests
make test-cov         # Run unit tests with coverage
make lint             # Lint the code
make build            # Build all packages and apps

make docker-dev-up    # Start dev containers (watch mode)
make docker-prod-up   # Start prod containers

make kube-init        # Initialise local Kind cluster
make kube-dev         # Build + deploy to local Kind cluster
```

## Documentation

- [Overview](./docs/01-readme.md) — design principles, architecture, conventions
- [Getting started](./docs/02-getting-started.md) — full commands reference, access URLs
- [Configuration](./docs/03-configuration.md) — config system, endpoints, env vars
- [Modules](./docs/04-modules.md) — module system, auth module, audit module
- [Infrastructure](./docs/05-infrastructure.md) — Docker, observability, CI/CD, deployment
- [Code structure](./docs/06-code-structure.md) — monorepo, API, and Helm directory layouts
- [Testing](./docs/07-testing.md) — testing pyramid, unit tests, integration tests, e2e tests
- [CLI](./docs/08-cli.md) — `tmts` command-line tool: installation, configuration, command reference
- [MCP Server](./docs/09-mcp.md) — `tmts-mcp` MCP server: stdio & HTTP transport, IDE integration
