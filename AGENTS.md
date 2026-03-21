# Agent Guidelines

## Project identity

Opinionated **TypeScript monorepo template** built with **Bun + Fastify + Prisma + BetterAuth**.
It ships a working API example with authentication, an optional audit module, and full observability.

## Design principles (by priority)

1. **Simple first** — prefer configuration over custom code. Use BetterAuth plugins before writing custom logic.
2. **Extensible** — every feature is opt-in via env toggles (`MODULES__*`). New modules follow the `AppModule` interface.
3. **SaaS & On-Premise ready** — support public & enterprise deployments (Keycloak OIDC, org management, quotas).
4. **Performant & scalable** — stateless where possible, Redis session caching, K8s-native Helm chart. Enable `experimental.joins` for BetterAuth Prisma.
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

## Architecture patterns

- **Ports & Adapters** — packages define interfaces, `apps/api` provides Prisma implementations.
- **AppModule system** — each module (`auth`, `audit`) is self-contained with `register`, `onReady`, `onClose`.
- **Multi-file Prisma schema** — `schema.prisma` (config), `auth.prisma` (BetterAuth-managed), `audit.prisma`.
- **BetterAuth owns identity & access control** — user, session, account, org, member, invitation, API key, JWKS are all BetterAuth-managed models. Organization-level RBAC is handled by BetterAuth's `organization()` plugin with typed `createAccessControl` (see `access-control.ts`).
- **Modules are self-contained** — `audit` lives in `apps/api/src/modules/audit/` with its own types, schemas, logger and Prisma repository. Domain-specific extensions (projects, quotas, etc.) are meant to be added by the consuming application, not the template.
- **MCP server is an app** — `mcp` lives in `apps/mcp/` with its own Dockerfile, deployed as a standalone HTTP or stdio service.

## Key conventions

- **Imports**: use `~/` alias for `apps/api/src/`, `type` imports for types only.
- **Module toggle**: `MODULES__<NAME>=true|false`. Disabled modules install no-op decorators.
- **Error handling**: throw typed errors (`APIError`), never return error objects.
- **Tests**: Vitest, co-located `*.spec.ts` files, mock DB via factory functions.
- **Prisma schema changes**: after editing `*.prisma`, run `bunx prisma generate` and `bunx tsc --noEmit` to validate.
- **BetterAuth schema changes**: use `npx auth@latest generate` to generate schema, then reconcile with multi-file layout.
- **Env config**: prefixed env vars (`API__`, `DB__`, `AUTH__`, etc.) parsed with `__` splitting into nested objects.
- **Grafana dashboards**: live in two places that must stay in sync — `docker/otel/grafana/dashboards/` (Docker Compose) and `helm/files/dashboards/` (Kubernetes ConfigMaps loaded by the Grafana sidecar).
- **CI/CD workflows**: orchestrators (`ci.yml`, `cd.yml`, `cache.yml`, `preview.yml`) call reusable workflows from `this-is-tobi/github-workflows@v0`. The only local reusable workflow is `release-cli.yml`. All third-party GitHub Actions must be SHA-pinned with a version comment. Workflow documentation lives in `docs/05-infrastructure.md`.

## Quality checklist

Before considering any task done, verify:

- **Typed** — no `any`. Use proper interfaces, `unknown` + narrowing, or Zod inference.
- **Factorized** — no duplication. Extract shared logic to pure functions or shared packages.
- **Tested** — every `foo.ts` has a co-located `foo.spec.ts`. All tests pass (`bun run test`).
- **Secure** — no hardcoded secrets, no inline passwords, minimal privilege, validate all inputs with Zod.
- **Scalable** — stateless where possible, no in-memory state that breaks multi-replica deploys.
- **Optimized** — lazy connections, connection pooling, no N+1 queries.
- **Documented** — public APIs have JSDoc, env vars documented in `docs/03-configuration.md`.
- **Compiles** — `bun run compile` exits clean.
- **Builds** — `bun run build` (or `docker build`) succeeds.

## What NOT to do

- Don't duplicate what BetterAuth already provides (user CRUD, org management, session handling).
- Don't add packages to `apps/api` that belong in a shared package.
- Don't use `any` — find or create proper types.
- Don't skip tests — every change must keep 100% test pass rate.
- Don't hardcode URLs or secrets — use config system.
- Don't store Prisma models for `user`, `session`, `account`, `organization`, `member`, `invitation`, `apikey` — those are BetterAuth-managed.
- Don't write stateful logic directly at module scope if it prevents unit testing — extract it into a pure factory function first.
