# Testing

## Overview

The template follows a four-layer testing strategy:

```txt
┌──────────────────────────────────────┐
│      Performance tests (k6)          │  packages/k6
│   Smoke / load / stress / spike      │
│   → Grafana dashboard via OTLP       │
├──────────────────────────────────────┤
│         E2E tests (Playwright)       │  packages/playwright
│   Full stack — real browser + API    │
├──────────────────────────────────────┤
│       Integration tests (Vitest)     │  apps/api/src/**/*.spec.ts
│  HTTP layer — real Fastify instance, │
│  mocked Prisma                       │
├──────────────────────────────────────┤
│         Unit tests (Vitest)          │  apps/api/src/**/*.spec.ts
│   Pure functions, schemas, business  │  packages/*/src/**/*.spec.ts
│   logic — no I/O                     │
└──────────────────────────────────────┘
```

## Unit & integration tests

### Runner

Unit and integration tests use [Vitest](https://vitest.dev/), which is Jest-compatible and faster when running on top of Bun.

```sh
# Run all tests
make test

# Run with coverage report
make test-cov

# Run full validation suite (lint + tests + build)
make validate
```

Tests can also be targeted at workspace level:

```sh
bun run --cwd apps/api test
bun run --cwd packages/shared test
```

### File conventions

- Test files are co-located with source files: `foo.ts` → `foo.spec.ts`.
- Test files live under `src/` and are matched by `src/**/*.spec.ts`.
- Type files (`types.ts`), generated code (`generated/**`) and mock directories (`__*__/`) are excluded from coverage.

### Global setup (`vitest-init.ts`)

The `apps/api/vitest-init.ts` setup file runs before every test suite and:

- Globally mocks the Prisma client, Prisma helper functions, the BetterAuth instance and the auth middleware — no real database connection is needed.
- Forces `NODE_ENV=test`.
- Stubs `process.exit` so tests never terminate the runner.
- Suppresses the known Fastify `ERR_HTTP_HEADERS_SENT` unhandled-rejection noise.
- Resets all mocks before each test with `beforeEach(() => vi.clearAllMocks())`.

### Mock factories (`src/__mocks__/`)

| File           | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `factories.ts` | Shared Prisma-shaped mock data builders (e.g. `mockProject()`) |
| `database.ts`  | Prisma client mock — replace individual model methods per test |

### Auth middleware mock (`src/modules/auth/__mocks__/middleware.ts`)

Because `vi.mock('~/modules/auth/middleware.js')` is declared in `vitest-init.ts`, a **manual mock** is used instead of auto-mocking. It automatically populates `req.session` on every request so route handlers can safely read the current user.

The default session has `role: 'admin'` so existing tests bypass ownership checks. For tests that exercise ownership logic, override `requireAuth` once and use either of the exported session fixtures:

```ts
import { requireAuth, mockUserSession, MOCK_USER_ID, MOCK_ADMIN_ID }
  from '~/modules/auth/middleware.js'

// Simulate a non-admin user for this single request:
vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
  req.session = mockUserSession as any
})
```

| Export            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `MOCK_ADMIN_ID`   | User id used by the default (admin) mock session     |
| `MOCK_USER_ID`    | User id used by `mockUserSession` (regular user)     |
| `mockSession`     | Default admin session attached to all requests       |
| `mockUserSession` | Regular-user session for ownership tests             |
| `requireAuth`     | `vi.fn()` — overridable per test                     |
| `requireRole`     | Factory returning `vi.fn()` — overridable per test   |
| `isAdmin`         | `vi.fn()` — reads `req.session.user.role` by default |

Example usage:

```ts
import { mockProject } from '~/__mocks__/factories.js'
import { prismaMock } from '~/__mocks__/database.js'

prismaMock.project.findMany.mockResolvedValue([
  mockProject({ id: randomUUID(), name: 'My Project', ownerId: randomUUID() }),
])
```

### `test-utils` package

The shared `packages/test-utils` package exposes utilities reusable across all workspaces:

| Export         | Signature               | Description                                    |
| -------------- | ----------------------- | ---------------------------------------------- |
| `repeatFn`     | `(n) => (fn) => T[]`    | Call a factory `n` times and collect results   |
| `makeWritable` | `(module, key, value?)` | Make a read-only property writable for testing |
| `isWritable`   | `(obj, key) => boolean` | Check if a property descriptor is writable     |

### Coverage

Coverage is collected with Istanbul and reported as `text` (terminal) and `lcov` (for CI / Sonarqube).

```sh
make test-cov
# Report → apps/api/coverage/lcov-report/index.html
```

Coverage configuration (`vitest.config.ts`):

```ts
coverage: {
  provider: 'istanbul',
  reporter: ['text', 'lcov'],
  include: ['src/**/*'],
  exclude: ['**/__*__/*', '**/*.spec.ts', '**/types.ts', '**/generated/**'],
}
```

> *__Notes:__*
> - *`auth/auth.ts` is intentionally excluded from coverage because the BetterAuth instance is globally mocked in `vitest-init.ts`.*
> - *`utils/otel.ts` SDK initialisation block is guarded by `NODE_ENV !== 'test'` and cannot be covered by unit tests.*

### Turbo pipeline

Vitest tasks are wired into the Turbo pipeline. The `test` task depends on `^compile` and `^build`, ensuring shared packages are compiled before any test suite runs:

```jsonc
// turbo.json
{
  "test": { "dependsOn": ["^compile", "^build"] },
  "test:cov": { "dependsOn": ["^compile", "^build"], "outputs": ["coverage/**"] }
}
```

## End-to-end tests

### Runner

E2E tests use [Playwright](https://playwright.dev/) and live in `packages/playwright/tests/specs/`.

Tests run against a live stack (docker-compose or Kubernetes). They are split into two groups:

| Match pattern      | Description                                |
| ------------------ | ------------------------------------------ |
| `api/**/*.e2e.ts`  | API tests — run in Chromium and Firefox    |
| `docs/**/*.e2e.ts` | Documentation site tests — run in Chromium |

### Running E2E tests

By default, `make test-e2e` runs only in **Chromium** for fast feedback. Use `make test-e2e-full` to run across all browsers (Chromium, Firefox, WebKit).

```sh
# Chromium only — against local dev stack (auto-manages dev stack)
make test-e2e

# All browsers — against local dev stack (auto-manages dev stack)
make test-e2e-full

# Against docker-compose dev stack (Chromium only)
make docker-e2e

# Against docker-compose prod stack — all browsers (CI)
make docker-e2e-ci

# Against local Kind cluster
make kube-e2e
```

### Configuration

Key Playwright options from `packages/playwright/playwright.config.ts`:

| Option          | Value                                 |
| --------------- | ------------------------------------- |
| `testDir`       | `./tests/specs`                       |
| `fullyParallel` | `true`                                |
| `retries`       | `2` (CI only)                         |
| `timeout`       | `30 s` per test, `5 s` for assertions |
| `trace`         | `on-first-retry`                      |

Targets are configured via environment variables:

| Variable    | Default     |
| ----------- | ----------- |
| `API_HOST`  | `localhost` |
| `API_PORT`  | `8081`      |
| `DOCS_HOST` | `localhost` |
| `DOCS_PORT` | `8082`      |

### CI integration

The CI workflow selects between E2E and deployment tests based on what changed:

- **Apps / packages / helm changed** → runs `test-playwright.yml` (Playwright against docker-compose).
- **Only config / docs changed** → runs `test-kube-deployment.yml` (Kind-based deployment smoke tests).

## Performance tests (k6)

The `@template-monorepo-ts/k6` package contains seven [k6](https://k6.io/) scenarios — from a fast PR-time smoke check up to a Kubernetes-scale breakpoint test driven by realistic, weighted user journeys against authenticated BetterAuth sessions.

| Scenario     | Purpose                                           | Default load            |
| ------------ | ------------------------------------------------- | ----------------------- |
| `smoke`      | PR gate. Probes only, no auth.                    | 1 VU / 30 s             |
| `load`       | Steady production-like load (closed model).       | 50 VUs ramp / 3 min     |
| `stress`     | Push past expected capacity, watch degradation.   | 400 VUs ramp            |
| `spike`      | Sudden 10x burst (open-model, honest stampede).   | 20 → 500 rps            |
| `realistic`  | **Mixed** open + closed model, weighted journeys. | 50 VUs + 200 rps        |
| `soak`       | Endurance — leak / FD / pool exhaustion hunt.     | 30 VUs + 50 rps for 1 h |
| `breakpoint` | Find the capacity ceiling. Aborts on SLO break.   | 50 → 5000 rps           |

The realistic / soak / breakpoint scenarios run a `setup()` step that signs in as the admin user, mints `K6_POPULATION_USERS` synthetic users, signs each one in, and creates an API key per user. The journeys then pick from the population to drive a weighted mix modelled on a typical SaaS dashboard:

| Weight | Journey            | Family |
| -----: | ------------------ | ------ |
|     35 | `browse_dashboard` | browse |
|     20 | `list_projects`    | browse |
|     15 | `view_project`     | browse |
|     10 | `create_project`   | write  |
|      8 | `update_project`   | write  |
|      4 | `apikey_call`      | browse |
|      4 | `list_audit`       | admin  |
|      4 | `list_users`       | admin  |

Each journey tags its requests with `journey={browse,write,admin,auth}` so we apply **per-family SLOs** in `realisticThresholds`:

| Family |   p95 |   p99 | Error rate |
| ------ | ----: | ----: | ---------: |
| browse | 400ms | 800ms |     <0.5 % |
| write  | 800ms |  1.5s |       <1 % |
| admin  |    1s |    2s |       <2 % |
| auth   | 700ms |  1.5s |       <1 % |

### Running

```sh
make test-perf-smoke
make test-perf-load
make test-perf-realistic       # recommended dev signal
make test-perf-stress
make test-perf-spike
make test-perf-soak            # long — set K6_DURATION=15m to shorten
make test-perf-breakpoint
```

`k6` must be installed locally (`brew install k6` or [other methods](https://k6.io/docs/getting-started/installation/)). The Makefile auto-manages the dev stack just like the e2e targets.

### Streaming results to Grafana

Set `OTEL=1` to stream metrics to the OTel collector running in the dev stack:

```txt
k6 ──OTLP/HTTP──▶ otel-collector ──exporter──▶ prometheus ──▶ grafana
                                                                  │
                                                                  ▼
                                          dashboard: k6-performance
```

```sh
OTEL=1 make test-perf-realistic
# Open http://localhost:3000/d/k6-performance/k6-performance
```

The dashboard ships in two synchronised locations:

- `docker/otel/grafana/dashboards/k6-performance.json` — Compose Grafana.
- `helm/files/dashboards/k6-performance.json` — picked up by the Grafana sidecar in Kubernetes deployments.

It exposes test-summary stats, request rate split by status, latency percentiles + heatmap, virtual-user count, error rate, iteration rate, and check failures, all sliceable by `scenario` and `test_run_id`.

### Production scale via k6-operator

A single k6 process tops out around **30 k VUs** on a beefy host. To drive Kubernetes-scale traffic (thousands+ concurrent connections), shard the load across pods using the [k6-operator](https://github.com/grafana/k6-operator):

```sh
# 1. Install the operator (one-off):
kubectl apply -f https://github.com/grafana/k6-operator/releases/latest/download/bundle.yaml

# 2. Ship the scripts as a ConfigMap:
kubectl create configmap k6-scripts \
  --from-file=packages/k6/lib \
  --from-file=packages/k6/scenarios

# 3. Apply the bundled TestRun (parallelism × K6_VUS == effective VUs):
kubectl apply -f packages/k6/k8s/testrun.yaml
```

`parallelism: 10` with `K6_VUS=200` per pod = **2000 concurrent users**; each pod ships metrics to the cluster-internal OTel collector, so the Grafana dashboard merges all shards transparently.

### Tunable env vars

All scenarios accept env-driven knobs so the same script works from laptop to multi-pod runs — see [packages/k6/README.md](../packages/k6/README.md) for the full table.
