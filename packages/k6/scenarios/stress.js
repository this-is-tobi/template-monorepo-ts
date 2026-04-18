// Stress test — push past expected capacity.
//
// Heavier than `load.js`, looser thresholds (we expect some degradation).
// Uses the realistic journey mix so the metrics are directly comparable.
//
// Tune via env vars:
//   K6_VUS_PEAK   peak VUs (default 400)
//   K6_DURATION   total run duration (default 9m, divided across stages)
//
// Run with: OTEL=1 make test-perf-stress

import { realisticThresholds } from '../lib/config.js'
import { runWeightedIteration } from '../lib/journeys.js'
import { setupTraffic } from '../lib/setup.js'

const VUS_PEAK = Number.parseInt(__ENV.K6_VUS_PEAK || '400', 10)

export const options = {
  stages: [
    { duration: '1m', target: Math.round(VUS_PEAK * 0.125) },
    { duration: '2m', target: Math.round(VUS_PEAK * 0.25) },
    { duration: '2m', target: Math.round(VUS_PEAK * 0.5) },
    { duration: '2m', target: VUS_PEAK },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    ...realisticThresholds,
    // Relax all thresholds — stress tests push past normal capacity.
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
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
