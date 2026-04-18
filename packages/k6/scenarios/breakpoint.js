// Breakpoint / capacity-discovery test.
//
// Uses k6's open-model `ramping-arrival-rate` executor to keep adding
// throughput until thresholds break — the moment they do, k6 aborts the
// run. The break-point you observe is your current capacity ceiling.
//
// Open-model is critical here: a closed-model (constant-vus) test would
// stop adding load as soon as response time grew, masking the true
// breakpoint. With open-model, each second still tries to issue N reqs
// regardless of how slow the previous batch was — exactly how a real
// stampede behaves.
//
// Tune via env vars:
//   K6_START_RPS  starting request rate per second (default 50)
//   K6_MAX_RPS    upper bound to ramp to (default 5000)
//   K6_STEP       seconds spent at each ramp step (default 1m)
//   K6_STEPS      number of ramp steps (default 10)
//
// Run with:  K6_MAX_RPS=10000 OTEL=1 make test-perf-breakpoint

import { realisticThresholds } from '../lib/config.js'
import { runWeightedIteration } from '../lib/journeys.js'
import { setupTraffic } from '../lib/setup.js'

const START_RPS = Number.parseInt(__ENV.K6_START_RPS || '50', 10)
const MAX_RPS = Number.parseInt(__ENV.K6_MAX_RPS || '5000', 10)
const STEPS = Number.parseInt(__ENV.K6_STEPS || '10', 10)
const STEP = __ENV.K6_STEP || '1m'

function buildStages() {
  const stages = []
  const increment = (MAX_RPS - START_RPS) / STEPS
  for (let i = 1; i <= STEPS; i++) {
    stages.push({ duration: STEP, target: Math.round(START_RPS + increment * i) })
  }
  // Tail: cool-down to 0 to capture recovery latency in the dashboard.
  stages.push({ duration: '30s', target: 0 })
  return stages
}

export const options = {
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: START_RPS,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      // k6 requires a hard cap; size for k8s-like deployments where each
      // VU may need to wait on a slow downstream during the breakdown.
      maxVUs: 5000,
      stages: buildStages(),
      exec: 'default',
    },
  },
  // `abortOnFail` makes k6 stop the moment any threshold breaks — that
  // value of `target` is your breakpoint. The CI summary will report it.
  thresholds: {
    ...realisticThresholds,
    // abortOnFail: k6 stops the moment a threshold breaks — that target is the breakpoint.
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '15s' }],
    http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '15s' }],
    'http_req_duration{journey:browse}': ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed{journey:browse}': ['rate<0.05'],
    'http_req_duration{journey:write}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed{journey:write}': ['rate<0.05'],
    'http_req_duration{journey:admin}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed{journey:admin}': ['rate<0.05'],
    'http_req_duration{journey:auth}': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed{journey:auth}': ['rate<0.05'],
  },
  noConnectionReuse: false,
}

export function setup() {
  return setupTraffic()
}

export default function (data) {
  runWeightedIteration(data)
}
