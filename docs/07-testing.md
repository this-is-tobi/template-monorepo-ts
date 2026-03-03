# Testing

## Overview

The template follows a three-layer testing strategy:

```txt
┌──────────────────────────────────────┐
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
- Resets all mocks before each test with `beforeEach(() => vi.resetAllMocks())`.

### Mock factories (`src/__mocks__/`)

| File           | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `factories.ts` | Shared Prisma-shaped mock data builders (e.g. `mockUser()`)    |
| `database.ts`  | Prisma client mock — replace individual model methods per test |

Example usage:

```ts
import { mockUser } from '~/__mocks__/factories.js'
import { prismaMock } from '~/__mocks__/database.js'

prismaMock.user.findMany.mockResolvedValue([
  mockUser({ id: randomUUID(), firstname: 'Alice', lastname: 'Smith', email: 'alice@example.com' }),
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

```sh
# Against local dev stack (requires make dev in another terminal)
make test-e2e

# Against docker-compose dev stack
make docker-e2e

# Against docker-compose prod stack (CI)
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

- **Apps / packages / helm changed** → runs `tests-e2e.yml` (Playwright against docker-compose).
- **Only config / docs changed** → runs `tests-deploy.yml` (deployment smoke tests).
