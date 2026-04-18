// Realistic mixed-traffic scenario.
//
// Simulates production-like behaviour: a population of authenticated
// users firing weighted journeys (browse 70 %, write 25 %, admin 5 %).
// Uses k6 `scenarios` to mix two traffic patterns:
//   - `steady_users` (constant-vus) : a baseline of returning users
//   - `bursty_traffic` (ramping-arrival-rate) : open-model rps that
//     ramps to a target throughput regardless of response time
//
// Tune via env vars:
//   K6_VUS              constant VUs for the baseline (default 50)
//   K6_TARGET_RPS       peak request rate for the bursty arm (default 200)
//   K6_DURATION         steady-state duration (default 5m)
//   K6_RAMP             ramp-up duration before steady state (default 1m)
//   K6_POPULATION_USERS number of synthetic users to seed (default 20)
//
// Run with:  OTEL=1 make test-perf-realistic
// (or)       k6 run packages/k6/scenarios/realistic.js

import { realisticThresholds } from '../lib/config.js'
import { runWeightedIteration } from '../lib/journeys.js'
import { setupTraffic } from '../lib/setup.js'

const VUS = Number.parseInt(__ENV.K6_VUS || '50', 10)
const TARGET_RPS = Number.parseInt(__ENV.K6_TARGET_RPS || '200', 10)
const DURATION = __ENV.K6_DURATION || '5m'
const RAMP = __ENV.K6_RAMP || '1m'

export const options = {
  scenarios: {
    steady_users: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '30s',
      tags: { scenario_arm: 'steady_users' },
      exec: 'default',
    },
    bursty_traffic: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: VUS,
      maxVUs: VUS * 4,
      stages: [
        { duration: RAMP, target: TARGET_RPS },
        { duration: DURATION, target: TARGET_RPS },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario_arm: 'bursty_traffic' },
      exec: 'default',
    },
  },
  thresholds: realisticThresholds,
  // Surface aggregated p95/p99 in the CLI summary alongside the dashboard.
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  noConnectionReuse: false,
  discardResponseBodies: false,
}

export function setup() {
  return setupTraffic()
}

export default function (data) {
  runWeightedIteration(data)
}

export function teardown(_data) {
  // Nothing to clean up — projects/users live in an ephemeral DB and are
  // pruned by the audit retention sweep. Add cleanup here if your env
  // requires it.
}
