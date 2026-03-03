# GitHub Copilot Instructions

> This file is the authoritative AI context for this repository.
> Compatible with GitHub Copilot (VS Code), Cursor, Windsurf, and any tool
> that reads `.github/copilot-instructions.md` or `AGENTS.md`.

See [AGENTS.md](../AGENTS.md) for the full set of project guidelines.
The sections below are Copilot-specific additions.

---

## Quick reference

```txt
Runtime:   Bun 1.x
API:       Fastify 5  (apps/api/src/)
Auth:      BetterAuth 1.5+  (apps/api/src/modules/auth/)
ORM:       Prisma 7+  (apps/api/prisma/)
Validate:  Zod 4
Tests:     Vitest — co-located *.spec.ts
Infra:     Helm + CNPG + Redis + Keycloak + OTel stack (helm/)
```

---

## When writing or editing code

1. **Never use `any`.**  If a library type is missing, create a minimal
   interface or use `unknown` + narrowing.
2. **Always co-locate tests** (`foo.ts` → `foo.spec.ts`).  Target 100 % pass
   rate before considering a task done.
3. **Config via env vars** — no hardcoded URLs, secrets, or ports.  All env
   vars are parsed in `apps/api/src/utils/config.ts` using Zod.
4. **Feature toggles** — new optional features go behind
   `MODULES__<FEATURE>=true|false`.  Disabled → install no-op decorators.
5. **BetterAuth owns identity** — do not re-implement user/session/org CRUD.
   Use BetterAuth's admin API and plugin system instead.
6. **Throw, never return, errors** — use the typed `APIError` helper.

---

## File/module conventions

| Pattern | Location |
|---|---|
| New API module | `apps/api/src/modules/<name>/index.ts` |
| Shared types/utils | `packages/shared/src/` |
| Prisma schema additions | `apps/api/prisma/<domain>.prisma` |
| Helm values | `helm/values.yaml` (defaults) + `ci/kind/env/helm-values.{dev,prod}.yaml` |
| Env var | `config.ts` Zod schema → `APP__KEY__SUBKEY` → `config.app.key.subKey` |

---

## Helm / infra conventions

- All dependency sub-charts are **disabled by default** (`enabled: false`).
- Redis session storage has three modes (priority order): Sentinel (`AUTH__REDIS_SENTINEL_URLS`) → Standalone (`AUTH__REDIS_URL`) → None (DB). See `redis.ts`.
  - `AUTH__REDIS_PASSWORD` authenticates to Redis nodes; `AUTH__REDIS_SENTINEL_PASSWORD` authenticates to Sentinel nodes (falls back to `AUTH__REDIS_PASSWORD` when not set).
- PgBouncer is **off by default** — see the commented `pooler` block in
  `helm/values.yaml`.  Enable only for high-concurrency bursty workloads and
  add `pgbouncer=true` to `DATABASE_URL` when doing so.
- OTel collector, Tempo, and kube-prometheus-stack pipeline mirrors
  `docker/otel/collector.yaml` exactly — keep them in sync.
- Grafana dashboards live in **two places** that must stay in sync:
  `docker/otel/grafana/dashboards/` (Docker Compose) and `helm/files/dashboards/` (Kubernetes ConfigMaps).
- In Kubernetes, service DNS names are stabilised with `fullnameOverride`:
  `tempo` → `http://tempo:3200`, `opentelemetry-collector` → `http://opentelemetry-collector:4318`.
  Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://opentelemetry-collector:4318` in `api.env`.

---

## Testing patterns

```ts
// Mock a module globally (vitest-init.ts already mocks auth & prisma)
vi.mock('~/modules/auth/middleware.js')            // uses __mocks__/
vi.mock('ioredis', () => ({ default: vi.fn() }))   // inline factory mock

// Unmock to test the real implementation
vi.unmock('~/modules/auth/middleware.js')
const { requireAuth } = await import('~/modules/auth/middleware.js')

// Config override in a single test
vi.mock('~/utils/config.js', () => ({ config: { ...defaults, myField: 'x' } }))
```

---

## What Copilot should NOT do

- Do not suggest storing sessions outside BetterAuth's `secondaryStorage` field.
- Do not suggest adding a new HTTP library or auth library — use Fastify / BetterAuth.
- Do not generate Prisma models for `user`, `session`, `account`, `organization`,
  `member`, `invitation`, `apikey` — those are owned by BetterAuth.
- Do not suggest inline `password` fields in Helm values for production — always
  reference `existingSecret`.
