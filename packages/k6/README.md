# `@template-monorepo-ts/k6` — performance tests

Production-grade [k6](https://k6.io/) suite covering smoke, load, stress, spike, **realistic mixed-traffic**, **soak (endurance)** and **breakpoint (capacity discovery)** scenarios.

The realistic / soak / breakpoint scenarios authenticate against BetterAuth, seed a population of synthetic users, and drive a **weighted journey mix** (browse 70 % / write 25 % / admin 5 %) that mirrors how production users actually use a SaaS dashboard.

Results stream out via OTLP to the existing OTel collector → Prometheus → Grafana stack — see the [`k6 Performance` dashboard](http://localhost:3000/d/k6-performance/k6-performance).

## Prerequisites

Install [k6](https://k6.io/docs/getting-started/installation/) (the binary lives outside the Bun toolchain):

```sh
brew install k6           # macOS
sudo apt install k6       # Debian/Ubuntu
docker run --rm -i grafana/k6 run - <scenario.js>   # docker
```

## Layout

```txt
packages/k6/
├── lib/
│   ├── config.js      # base URL, thresholds, helpers
│   ├── auth.js        # BetterAuth sign-in / admin-create / api-key
│   ├── setup.js       # setup() — seeds users + cookies + API keys
│   └── journeys.js    # weighted journey selector + journey impls
├── scenarios/
│   ├── smoke.js       # 1 VU / 30 s — PR gate, no auth
│   ├── load.js        # 50 VUs ramp / 3 min — closed model
│   ├── stress.js      # 400 VUs ramp — push past expected capacity
│   ├── spike.js       # 20→500 rps burst — open model
│   ├── realistic.js   # 50 VUs + 200 rps overlay — weighted journeys
│   ├── soak.js        # 30 VUs + 50 rps for 1 h — endurance / leak hunt
│   ├── breakpoint.js  # 50 → 5000 rps ramp, abort on SLO break
│   └── seed.js        # HTTP-based user population seeding (for Kube)
└── k8s/
    └── testrun.yaml   # k6-operator manifest for distributed runs
```

## Scenarios

| Scenario     | Goal                                            | Default load              | SLO source                                  |
| ------------ | ----------------------------------------------- | ------------------------- | ------------------------------------------- |
| `smoke`      | PR-time sanity — confirms probes serve 2xx.     | 1 VU / 30 s               | `standardThresholds`                        |
| `load`       | Steady production-like traffic.                 | 50 VUs / 3 min            | `realisticThresholds`                       |
| `stress`     | Push past expected capacity, watch degradation. | 400 VUs ramp              | `realisticThresholds` + looser bounds       |
| `spike`      | Sudden 10x burst → recovery.                    | 20 → 500 rps (open model) | `realisticThresholds` + looser p99          |
| `realistic`  | Mixed weighted traffic + open-model overlay.    | 50 VUs + 200 rps          | `realisticThresholds` (per-journey budgets) |
| `soak`       | Endurance / leak hunt.                          | 30 VUs + 50 rps for 1 h   | `realisticThresholds` (relaxed p95)         |
| `breakpoint` | Find the capacity ceiling. Aborts on SLO break. | 50 → 5000 rps             | `abortOnFail` thresholds                    |

## Tunable env vars

All scenarios accept env-driven knobs so the same script works from laptop to multi-pod k6-operator runs:

| Env var                           | Default                 | Used by             |
| --------------------------------- | ----------------------- | ------------------- |
| `K6_BASE_URL`                     | `http://localhost:8081` | all                 |
| `K6_ADMIN_EMAIL`                  | `admin@example.com`     | `setup()` flows     |
| `K6_ADMIN_PASSWORD`               | `admin`                 | `setup()` flows     |
| `K6_POPULATION_USERS`             | `20`                    | `setup()` flows     |
| `K6_VUS`                          | `50`                    | `realistic`, `soak` |
| `K6_VUS_TARGET`                   | `50`                    | `load`              |
| `K6_VUS_PEAK`                     | `400`                   | `stress`            |
| `K6_TARGET_RPS`                   | `200`                   | `realistic`, `soak` |
| `K6_BASELINE_RPS` / `K6_PEAK_RPS` | `20` / `500`            | `spike`             |
| `K6_START_RPS` / `K6_MAX_RPS`     | `50` / `5000`           | `breakpoint`        |
| `K6_DURATION`                     | scenario default        | all                 |

## Running locally

### Docker Compose (default)

The Makefile auto-manages the dev stack and waits for `/api/v1/healthz`:

```sh
make test-perf-smoke           # PR gate — no auth needed
make test-perf-load            # weighted journeys, closed model
make test-perf-realistic       # mixed open + closed model — recommended dev signal
make test-perf-stress
make test-perf-spike
make test-perf-soak            # set K6_DURATION=15m for a shorter run
make test-perf-breakpoint
```

Add `OTEL=1` to stream metrics to Grafana while the test runs:

```sh
OTEL=1 make test-perf-realistic
# Then open http://localhost:3000/d/k6-performance/k6-performance
```

### Kind Kubernetes

For production-representative metrics, run against a Kind cluster. Traffic goes through Traefik ingress at `api.domain.local:80` — the same path as real deployments:

```sh
make kube-perf-smoke           # PR gate — through ingress
make kube-perf-load
make kube-perf-realistic       # recommended Kubernetes signal
make kube-perf-stress
make kube-perf-spike
make kube-perf-soak
make kube-perf-breakpoint
```

The macro auto-deploys the Kind dev cluster if it is not running. Set `KUBE_PROD=1` to deploy the production Helm values (HPA 2–5 replicas, 3-instance CNPG, Redis Sentinel, PDB, NetworkPolicies):

```sh
KUBE_PROD=1 OTEL=1 make kube-perf-realistic
# Then open http://grafana.domain.local/d/k6-performance/k6-performance
```

User population seeding uses `scenarios/seed.js` which creates users via the BetterAuth admin HTTP API — no `kubectl exec` or direct DB access required, so it works with both dev and distroless prod images.

## Production-scale runs (Kubernetes)

A single k6 process tops out around 30 k VUs on a beefy host. To drive real Kubernetes-scale traffic (tens of thousands of concurrent connections), use the [k6-operator](https://github.com/grafana/k6-operator):

1. Install the operator:
   ```sh
   kubectl apply -f https://github.com/grafana/k6-operator/releases/latest/download/bundle.yaml
   ```
2. Ship the scripts as a `ConfigMap`:
   ```sh
   kubectl create configmap k6-scripts \
     --from-file=packages/k6/lib \
     --from-file=packages/k6/scenarios
   ```
3. Apply the bundled `TestRun` manifest (see [k8s/testrun.yaml](k8s/testrun.yaml)) and tune `parallelism` to your shard count.

`parallelism: 10` with `K6_VUS=200` per pod = **2000 concurrent users**; each pod ships metrics to the cluster-internal OTel collector, so the Grafana dashboard merges all shards transparently.

## Streaming results to Grafana

```txt
k6 ──OTLP/HTTP──▶ otel-collector ──exporter──▶ prometheus ──▶ grafana
                                                                  │
                                                                  ▼
                                          dashboard: k6-performance
```

The dashboard ships in two synchronised locations:

- `docker/otel/grafana/dashboards/k6-performance.json` — Compose Grafana.
- `helm/files/dashboards/k6-performance.json` — picked up by the Grafana sidecar in any Kubernetes deployment.

It exposes test summary stats, request rate by status, latency percentiles + heatmap, virtual-user count, error rate, iteration rate, and check failures, all sliceable by `scenario` and `test_run_id`.

## Adding a journey or a scenario

1. Add a new function to `lib/journeys.js`, give it a unique `endpoint` tag, and append `{ name, weight, journey, fn }` to `defaultMix` (or a custom mix).
2. To add a brand-new scenario, create `scenarios/<name>.js`, import `setupTraffic` from `../lib/setup.js`, export `setup()` and a default function that calls `runWeightedIteration(data)`.
3. Append a `make test-perf-<name>` wrapper in the repo root Makefile.

## What this does not test (yet)

- **Per-tenant isolation under load** — would require seeded multi-org data with realistic memberships.
- **WebSocket / SSE traffic** — k6 supports both (`k6/ws`, `k6/experimental/streams`); add a journey when you ship one of those endpoints.
- **DB-only contention** — for that, run `k6` alongside a `pg_bench` workload in the same cluster.
