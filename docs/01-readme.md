# Typescript monorepo template

This project provides an opinionated template structure for a **TypeScript monorepo** with a fully functional API example. It is designed to be a production-ready starting point for SaaS and on-premise applications, shipping authentication, audit logging, observability, and Kubernetes deployment out of the box.

## Design principles

The template follows these priorities, in order:

1. **Simple first** — prefer configuration over custom code. Use BetterAuth plugins before writing custom logic.
2. **Extensible** — every feature is opt-in via env toggles (`MODULES__*`). New modules follow the `AppModule` interface.
3. **SaaS & On-Premise ready** — support public & enterprise deployments (Keycloak OIDC, org management, quotas).
4. **Performant & scalable** — stateless where possible, Redis session caching, K8s-native Helm chart.
5. **Secure** — audit logs, OTel traces, strict Zod validation, minimal Docker images (distroless).
6. **Small footprint** — minimal dependencies, small images, fast cold starts.
7. **K8s-native** — Helm chart, multi-AZ/region/provider compatible, Kind for local dev.
8. **Highly tested** — every package and app has unit tests. Target 100% passing before any PR.
9. **Fully typed** — shared types via workspace packages. No `any`. Use Zod schemas as single source of truth.
10. **Factorized** — shared packages (`shared`, `eslint-config`, `ts-config`) to avoid duplication.
11. **Documented** — README.md is the reference. Keep it in sync with code changes.
12. **User-friendly** — clear error messages, Swagger UI, OpenAPI reference, good DX.

## Tech stack

| Layer         | Tool            | Notes                                                                                    |
| ------------- | --------------- | ---------------------------------------------------------------------------------------- |
| Runtime       | Bun 1.x         | Package manager, bundler, test runner                                                    |
| API           | Fastify 5       | Plugins: cookie, cors, helmet, otel, swagger                                             |
| Auth          | BetterAuth 1.5+ | Plugins: bearer, admin, twoFactor, openAPI, jwt, organization, apiKey, optional keycloak |
| ORM           | Prisma 7+       | Multi-file schema (`prisma/*.prisma`), PostgreSQL                                        |
| Validation    | Zod 4           | `z.record()` requires 2 args in v4                                                       |
| Observability | OpenTelemetry   | Collector → Prometheus + Tempo + Grafana                                                 |
| CI/CD         | GitHub Actions  | Turbo cache, Docker matrix builds, Trivy scans                                           |
| Deploy        | Helm + K8s      | Gateway API, Kind for local, ArgoCD preview                                              |

## Architecture

The template follows a **Ports & Adapters** pattern:

- **Packages define interfaces** — `apps/api` provides concrete Prisma implementations.
- **AppModule system** — each module (`auth`, `audit`) is self-contained with `register`, `onReady`, `onClose` lifecycle hooks.
- **Multi-file Prisma schema** — `schema.prisma` (config), `auth.prisma` (BetterAuth-managed), `audit.prisma`.
- **BetterAuth owns identity & access control** — user, session, account, org, member, invitation, API key, JWKS are all BetterAuth-managed models. Organization-level RBAC is handled by BetterAuth's `organization()` plugin with typed `createAccessControl` (see `access-control.ts`).
- **Modules are self-contained** — `audit` lives in `apps/api/src/modules/audit/` with its own types, schemas, logger and Prisma repository. Domain-specific extensions (projects, quotas, etc.) are meant to be added by the consuming application.
- **MCP server** — the `@template-monorepo-ts/mcp` package exposes API tools to LLMs via [Model Context Protocol](https://modelcontextprotocol.io/) with stdio and HTTP transport modes.

## Developer experience

The following tools are provided with the template:

- [Commitlint](https://github.com/conventional-changelog/commitlint) *— commit message linter.*
- [Eslint](https://eslint.org/) *— javascript linter.*
- [Husky](https://typicode.github.io/husky/) *— git hooks wrapper.*
- [Proto](https://moonrepo.dev/proto) *— javascript toolchain.*
- [Turbo](https://turbo.build/repo) *— repo building system with pipeline management.*

This template also includes recommendations for VSCode settings and extensions *(see [.vscode/settings.json](../.vscode/settings.json) and [.vscode/extensions.json](../.vscode/extensions.json))*.

To get a better developer experience, install [Ni](https://github.com/antfu/ni) globally — a Node.js package manager wrapper:

```sh
bun install --global @antfu/ni
```

## Key conventions

- **Imports**: use `~/` alias for `apps/api/src/`, `type` imports for types only.
- **Module toggle**: `MODULES__<NAME>=true|false`. Disabled modules install no-op decorators.
- **Error handling**: throw typed errors (`APIError`), never return error objects.
- **Tests**: Vitest, co-located `*.spec.ts` files, mock DB via factory functions.
- **Prisma schema changes**: after editing `*.prisma`, run `bunx prisma generate` and `bunx tsc --noEmit` to validate.
- **BetterAuth schema changes**: use `npx auth@latest generate` to generate schema, then reconcile with multi-file layout.
- **Env config**: prefixed env vars (`API__`, `DB__`, `AUTH__`, etc.) parsed with `__` splitting into nested objects.

## What NOT to do

- Don't duplicate what BetterAuth already provides (user CRUD, org management, session handling).
- Don't add packages to `apps/api` that belong in a shared package.
- Don't use `any` — find or create proper types.
- Don't skip tests — every change must keep 100% test pass rate.
- Don't hardcode URLs or secrets — use config system.
