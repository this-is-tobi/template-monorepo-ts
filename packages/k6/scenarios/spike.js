// Spike test — sudden 10x burst.
//
// Validates that the API survives a thundering-herd event (e.g. cron
// kicking off, marketing email blast). Uses an open-model executor so
// the surge is honest — no back-pressure from slow VUs.
//
// Tune via env vars:
//   K6_BASELINE_RPS   baseline rps before/after the spike (default 20)
//   K6_PEAK_RPS       peak rps during the spike (default 500)
//
// Run with: OTEL=1 make test-perf-spike

import { realisticThresholds } from '../lib/config.js'
import { runWeightedIteration } from '../lib/journeys.js'
import { setupTraffic } from '../lib/setup.js'

const BASELINE_RPS = Number.parseInt(__ENV.K6_BASELINE_RPS || '20', 10)
const PEAK_RPS = Number.parseInt(__ENV.K6_PEAK_RPS || '500', 10)

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: BASELINE_RPS,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '30s', target: BASELINE_RPS },
        { duration: '20s', target: PEAK_RPS },
        { duration: '40s', target: PEAK_RPS },
        { duration: '30s', target: BASELINE_RPS },
        { duration: '30s', target: 0 },
      ],
      exec: 'default',
    },
  },
  thresholds: {
    ...realisticThresholds,
    // Relax all thresholds — spike tests validate survival, not SLOs.
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(99)<3000'],
    'http_req_duration{journey:browse}': ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed{journey:browse}': ['rate<0.05'],
    'http_req_duration{journey:write}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed{journey:write}': ['rate<0.05'],
    'http_req_duration{journey:admin}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed{journey:admin}': ['rate<0.05'],
    'http_req_duration{journey:auth}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed{journey:auth}': ['rate<0.05'],
  },
}

export function setup() {
  return setupTraffic()
}

export default function (data) {
  runWeightedIteration(data)
}
