// Weighted user-journey selector.
//
// Based on a Pareto-style mix of real SaaS dashboards: the vast majority
// of traffic is reads (browse pages, refresh dashboards), with a smaller
// share of writes and a thin slice of admin operations. Adjust weights
// to match your own production telemetry once you have it.

import { check, group, sleep } from 'k6'
import http from 'k6/http'
import { Counter, Trend } from 'k6/metrics'
import { apiKeyAuth, cookieAuth } from './auth.js'
import { jsonHeaders, pick, uniqueSuffix } from './config.js'

// Custom metrics — exported alongside built-ins through the OTLP/Prometheus
// pipeline so the Grafana dashboard can plot per-journey throughput / errors.
export const journeyIters = new Counter('k6_journey_iterations_total')
export const journeyDuration = new Trend('k6_journey_duration_ms', true)

/**
 * The realistic mix used by `scenarios/realistic.js` and `scenarios/soak.js`.
 *
 * Weights are integers; they do not have to sum to 100, the selector
 * normalises them. We default to a 70 / 25 / 5 split (read / write / admin)
 * which mirrors typical SaaS dashboard observations.
 */
export const defaultMix = [
  { name: 'browse_dashboard', weight: 35, journey: 'browse', fn: browseDashboard },
  { name: 'list_projects', weight: 20, journey: 'browse', fn: listProjects },
  { name: 'view_project', weight: 15, journey: 'browse', fn: viewProject },
  { name: 'create_project', weight: 10, journey: 'write', fn: createProject },
  { name: 'update_project', weight: 8, journey: 'write', fn: updateProject },
  { name: 'list_audit', weight: 4, journey: 'admin', fn: listAudit },
  { name: 'list_users', weight: 4, journey: 'admin', fn: listUsers },
  { name: 'apikey_call', weight: 4, journey: 'browse', fn: apiKeyCall },
]

/**
 * Pick a journey from a weighted mix.
 */
export function pickJourney(mix = defaultMix) {
  const total = mix.reduce((sum, j) => sum + j.weight, 0)
  let target = Math.random() * total
  for (const j of mix) {
    target -= j.weight
    if (target <= 0) return j
  }
  return mix[mix.length - 1]
}

/**
 * Run one weighted iteration. `ctx` provides:
 *   - `baseUrl`     : API base URL
 *   - `userCookies` : array of session cookies (one per seeded user)
 *   - `apiKeys`     : array of API key strings
 *   - `adminCookie` : admin session cookie (for admin-tagged journeys)
 *   - `mix`         : optional override of `defaultMix`
 */
export function runWeightedIteration(ctx) {
  const journey = pickJourney(ctx.mix || defaultMix)
  const start = Date.now()
  group(journey.name, () => journey.fn(ctx))
  journeyIters.add(1, { journey: journey.journey, name: journey.name })
  journeyDuration.add(Date.now() - start, { journey: journey.journey, name: journey.name })
  // Think time: realistic users don't fire 100 req/s.  Random 0.5–2 s sleep.
  sleep(0.5 + Math.random() * 1.5)
}

// ---------------------------------------------------------------------------
// Journey implementations
// ---------------------------------------------------------------------------

function browseDashboard(ctx) {
  const cookie = pick(ctx.userCookies)
  const opts = cookieAuth(ctx.baseUrl, cookie, { journey: 'browse', endpoint: 'dashboard_bundle' })
  const responses = http.batch([
    { method: 'GET', url: `${ctx.baseUrl}/api/v1/auth/get-session`, params: opts },
    { method: 'GET', url: `${ctx.baseUrl}/api/v1/projects`, params: opts },
    { method: 'GET', url: `${ctx.baseUrl}/api/v1/auth/organization/list`, params: opts },
  ])
  responses.forEach(r => check(r, { 'dashboard bundle ok': res => res.status < 400 }))
}

function listProjects(ctx) {
  const cookie = pick(ctx.userCookies)
  const opts = cookieAuth(ctx.baseUrl, cookie, { journey: 'browse', endpoint: 'list_projects' })
  const res = http.get(`${ctx.baseUrl}/api/v1/projects`, opts)
  check(res, { 'list_projects 2xx': r => r.status >= 200 && r.status < 300 })
}

function viewProject(ctx) {
  const cookie = pick(ctx.userCookies)
  const optsList = cookieAuth(ctx.baseUrl, cookie, { journey: 'browse', endpoint: 'list_projects' })
  const list = http.get(`${ctx.baseUrl}/api/v1/projects`, optsList)
  if (list.status !== 200) return
  let projects
  try {
    projects = list.json()
  } catch (_e) {
    return
  }
  if (!Array.isArray(projects) || projects.length === 0) return
  const project = pick(projects)
  const opts = cookieAuth(ctx.baseUrl, cookie, { journey: 'browse', endpoint: 'get_project' })
  const detail = http.get(`${ctx.baseUrl}/api/v1/projects/${project.id}`, opts)
  check(detail, { 'view_project 2xx': r => r.status >= 200 && r.status < 300 })
}

function createProject(ctx) {
  const cookie = pick(ctx.userCookies)
  const body = JSON.stringify({
    name: `k6-${uniqueSuffix()}`,
    description: 'Created by k6 realistic scenario',
  })
  const res = http.post(
    `${ctx.baseUrl}/api/v1/projects`,
    body,
    {
      headers: { ...jsonHeaders, Origin: ctx.baseUrl, Cookie: `better-auth.session_token=${cookie}` },
      tags: { endpoint: 'create_project', journey: 'write', auth: 'cookie' },
    },
  )
  check(res, { 'create_project 2xx': r => r.status >= 200 && r.status < 300 })
}

function updateProject(ctx) {
  const cookie = pick(ctx.userCookies)
  const optsList = cookieAuth(ctx.baseUrl, cookie, { journey: 'browse', endpoint: 'list_projects' })
  const list = http.get(`${ctx.baseUrl}/api/v1/projects`, optsList)
  if (list.status !== 200) return
  let projects
  try {
    projects = list.json()
  } catch (_e) {
    return
  }
  if (!Array.isArray(projects) || projects.length === 0) return
  const project = pick(projects)
  const body = JSON.stringify({ description: `updated-${uniqueSuffix()}` })
  const res = http.put(
    `${ctx.baseUrl}/api/v1/projects/${project.id}`,
    body,
    {
      headers: { ...jsonHeaders, Origin: ctx.baseUrl, Cookie: `better-auth.session_token=${cookie}` },
      tags: { endpoint: 'update_project', journey: 'write', auth: 'cookie' },
    },
  )
  check(res, { 'update_project 2xx/4xx': r => r.status < 500 })
}

function listAudit(ctx) {
  if (!ctx.adminCookie) return
  const opts = cookieAuth(ctx.baseUrl, ctx.adminCookie, { journey: 'admin', endpoint: 'list_audit' })
  const res = http.get(`${ctx.baseUrl}/api/v1/audit?limit=50`, opts)
  check(res, { 'list_audit 2xx': r => r.status >= 200 && r.status < 300 })
}

function listUsers(ctx) {
  if (!ctx.adminCookie) return
  const opts = cookieAuth(ctx.baseUrl, ctx.adminCookie, { journey: 'admin', endpoint: 'list_users' })
  const res = http.get(`${ctx.baseUrl}/api/v1/auth/admin/list-users?limit=50`, opts)
  check(res, { 'list_users 2xx': r => r.status >= 200 && r.status < 300 })
}

function apiKeyCall(ctx) {
  if (!ctx.apiKeys || ctx.apiKeys.length === 0) {
    // Degrade gracefully to a cookie-auth call so the scenario still runs.
    return listProjects(ctx)
  }
  const key = pick(ctx.apiKeys)
  const opts = apiKeyAuth(key, { journey: 'browse', endpoint: 'apikey_list_projects' })
  const res = http.get(`${ctx.baseUrl}/api/v1/projects`, opts)
  check(res, { 'apikey_call 2xx/4xx': r => r.status < 500 })
}
