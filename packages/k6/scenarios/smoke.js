// Smoke test — minimal traffic, run on every PR.
// Goal: confirm the API responds correctly under near-zero load.
// Duration: ~30 s.  Run with `make test-perf-smoke`.

import { check, sleep } from 'k6'
import http from 'k6/http'
import { getBaseUrl, standardThresholds } from '../lib/config.js'

const BASE_URL = getBaseUrl()

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: standardThresholds,
}

export default function () {
  const liveness = http.get(`${BASE_URL}/api/v1/livez`)
  check(liveness, {
    'livez status is 200': r => r.status === 200,
    'livez body is OK': r => r.json('status') === 'OK',
  })

  const readiness = http.get(`${BASE_URL}/api/v1/readyz`)
  check(readiness, {
    'readyz responds with 200 or 503': r => r.status === 200 || r.status === 503,
  })

  const version = http.get(`${BASE_URL}/api/v1/version`)
  check(version, {
    'version status is 200': r => r.status === 200,
    'version body has version field': r => typeof r.json('version') === 'string',
  })

  sleep(1)
}
