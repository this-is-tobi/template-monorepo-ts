// Shared helpers for all k6 scenarios.
// k6 runs these scripts in a Goja runtime; only ES modules supported by k6
// (see https://k6.io/docs/javascript-api/) are usable here.

const DEFAULT_BASE_URL = 'http://localhost:8081'

/**
 * Resolve the API base URL from the K6_BASE_URL env var, falling back to
 * the local docker-compose dev stack address.
 */
export function getBaseUrl() {
  return (typeof __ENV !== 'undefined' && __ENV.K6_BASE_URL) || DEFAULT_BASE_URL
}

/**
 * Resolve admin credentials used for setup() flows (seeding tenants/data,
 * minting API keys for the test population). Defaults match the dev
 * docker-compose admin user.
 */
export function getAdminCredentials() {
  const env = typeof __ENV !== 'undefined' ? __ENV : {}
  return {
    email: env.K6_ADMIN_EMAIL || 'admin@example.com',
    password: env.K6_ADMIN_PASSWORD || 'admin',
  }
}

/**
 * Resolve the population size for setup-time seeding (users, projects).
 * Larger values produce more diverse traffic but lengthen setup.
 */
export function getPopulation() {
  const env = typeof __ENV !== 'undefined' ? __ENV : {}
  return {
    users: Number.parseInt(env.K6_POPULATION_USERS || '20', 10),
    projectsPerUser: Number.parseInt(env.K6_POPULATION_PROJECTS_PER_USER || '3', 10),
  }
}

/**
 * Standard SLO thresholds — used by simple scenarios that exercise
 * a single endpoint family (smoke / load).
 *
 * Tighten per deployment target before promoting to a CI gate.
 */
export const standardThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  checks: ['rate>0.99'],
}

/**
 * SLO thresholds for the realistic / mixed-traffic scenario. We split
 * by named tag so each user journey carries its own budget — this is
 * the way to express different SLOs per endpoint family.
 *
 * Tag conventions used in the journeys:
 * - `endpoint` : logical endpoint name (e.g. `list_projects`)
 * - `journey`  : higher-level journey grouping (`browse`, `write`, `admin`, `auth`)
 * - `auth`     : `cookie`, `apikey`, or `none`
 */
export const realisticThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<800', 'p(99)<1500'],
  checks: ['rate>0.995'],

  'http_req_duration{journey:browse}': ['p(95)<400', 'p(99)<800'],
  'http_req_failed{journey:browse}': ['rate<0.005'],

  'http_req_duration{journey:write}': ['p(95)<800', 'p(99)<1500'],
  'http_req_failed{journey:write}': ['rate<0.01'],

  'http_req_duration{journey:admin}': ['p(95)<1000', 'p(99)<2000'],
  'http_req_failed{journey:admin}': ['rate<0.02'],

  'http_req_duration{journey:auth}': ['p(95)<700', 'p(99)<1500'],
  'http_req_failed{journey:auth}': ['rate<0.01'],
}

/** Default JSON headers for write operations. */
export const jsonHeaders = { 'Content-Type': 'application/json' }

/** A request payload that exercises the JSON body parsing path. */
export const echoBody = JSON.stringify({ ping: 'pong' })

/**
 * Pick an item uniformly at random from an array.
 */
export function pick(array) {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Generate an opaque-but-unique identifier suffix for entities created
 * during the run. Combines VU + iter + random to stay unique even when
 * scenarios run in parallel.
 */
export function uniqueSuffix() {
  const vu = typeof __VU !== 'undefined' ? __VU : 0
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0
  return `${Date.now().toString(36)}-${vu}-${iter}-${Math.random().toString(36).slice(2, 6)}`
}
