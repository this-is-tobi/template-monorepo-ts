// Soak / endurance test.
//
// Runs the realistic mixed-traffic mix for a long period (default 1 h)
// at moderate load. Surfaces leaks, slow log build-up, file-descriptor
// exhaustion, connection-pool starvation — the things short tests miss.
//
// Tune via env vars:
//   K6_VUS           constant VUs (default 30)
//   K6_DURATION      total soak duration (default 1h)
//   K6_TARGET_RPS    open-model rps overlay (default 50)
//
// Run with:  K6_DURATION=30m OTEL=1 make test-perf-soak

import { realisticThresholds } from '../lib/config.js'
import { runWeightedIteration } from '../lib/journeys.js'
import { setupTraffic } from '../lib/setup.js'

const VUS = Number.parseInt(__ENV.K6_VUS || '30', 10)
const DURATION = __ENV.K6_DURATION || '1h'
const TARGET_RPS = Number.parseInt(__ENV.K6_TARGET_RPS || '50', 10)

export const options = {
  scenarios: {
    soak_users: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '1m',
      exec: 'default',
    },
    soak_open_model: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: VUS * 2,
      maxVUs: VUS * 6,
      exec: 'default',
    },
  },
  // Reuse the realistic SLOs but be slightly more lenient: long runs see
  // occasional GC pauses and rolling deploys.
  thresholds: {
    ...realisticThresholds,
    // Slightly relaxed — long runs see GC pauses and rolling deploys.
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    'http_req_duration{journey:browse}': ['p(95)<600', 'p(99)<1200'],
    'http_req_duration{journey:write}': ['p(95)<1000', 'p(99)<2000'],
    'http_req_duration{journey:admin}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{journey:auth}': ['p(95)<1000', 'p(99)<2000'],
  },
  noConnectionReuse: false,
}

export function setup() {
  return setupTraffic()
}

export default function (data) {
  runWeightedIteration(data)
}
