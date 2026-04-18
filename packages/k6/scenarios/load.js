// Load test — sustained realistic traffic.
//
// Drives the same weighted journey mix as `realistic.js` but with a
// closed-model `ramping-vus` executor so the comparison against the
// soak / breakpoint runs is apples-to-apples.
//
// Tune via env vars:
//   K6_VUS_TARGET   peak VUs (default 50)
//   K6_DURATION     steady-state duration (default 3m)
//
// Run with: OTEL=1 make test-perf-load

import { realisticThresholds } from '../lib/config.js'
import { runWeightedIteration } from '../lib/journeys.js'
import { setupTraffic } from '../lib/setup.js'

const VUS_TARGET = Number.parseInt(__ENV.K6_VUS_TARGET || '50', 10)
const DURATION = __ENV.K6_DURATION || '3m'

export const options = {
  stages: [
    { duration: '30s', target: Math.round(VUS_TARGET * 0.4) },
    { duration: DURATION, target: VUS_TARGET },
    { duration: '30s', target: 0 },
  ],
  thresholds: realisticThresholds,
  noConnectionReuse: false,
}

export function setup() {
  return setupTraffic()
}

export default function (data) {
  runWeightedIteration(data)
}
