// k6 setup() helper.
//
// Assumes the test population has already been seeded by:
//   bun run --cwd apps/api db:seed-perf        (direct)
//   make test-perf-seed                         (via Makefile)
//
// setup() only signs users in to obtain session cookies — no user
// creation happens here, which keeps setup fast and avoids
// BetterAuth admin-API race conditions under high parallelism.

import { fail } from 'k6'
import { createApiKey, signIn, signInOrFail } from './auth.js'
import { getAdminCredentials, getBaseUrl, getPopulation } from './config.js'

/**
 * @typedef {object} TrafficContext
 * @property {string} baseUrl - API base URL
 * @property {string} adminCookie - Admin BetterAuth session cookie value
 * @property {string[]} userCookies - Per-user BetterAuth session cookie values
 * @property {string[]} apiKeys - Plaintext API keys (one per user, when issued)
 */

/**
 * Sign in the pre-seeded population and return a `TrafficContext` for the VU iterations.
 * Prerequisite: run `make test-perf-seed` (or `bun run --cwd apps/api db:seed-perf`) first.
 *
 * @returns {TrafficContext} Context object handed to every VU iteration
 */
export function setupTraffic() {
  const baseUrl = getBaseUrl()
  const admin = getAdminCredentials()
  const population = getPopulation()

  // Sign in as admin — hard-fail: admin drives the audit / admin journeys.
  const adminCookie = signInOrFail(baseUrl, admin.email, admin.password)

  // Sign in each pre-seeded user.
  const prefix = (typeof __ENV !== 'undefined' && __ENV.K6_USER_EMAIL_PREFIX) || 'k6-user-'
  const domain = (typeof __ENV !== 'undefined' && __ENV.K6_USER_EMAIL_DOMAIN) || 'example.com'
  const password = (typeof __ENV !== 'undefined' && __ENV.K6_USER_PASSWORD) || 'k6-password-1234!'

  const userCookies = []
  const apiKeys = []

  for (let i = 0; i < population.users; i++) {
    const email = `${prefix}${i}@${domain}`
    const cookie = signIn(baseUrl, email, password)
    if (!cookie) {
      console.warn(`[k6] sign-in failed for ${email} — was the population seeded? Run: make test-perf-seed`)
      continue
    }
    userCookies.push(cookie)
    // Mint one API key per user (best-effort — the apiKey plugin must be enabled).
    const key = createApiKey(baseUrl, cookie, `k6-key-${i}`)
    if (key) apiKeys.push(key)
  }

  if (userCookies.length === 0) {
    fail('setup() authenticated 0 users — seed the population first: make test-perf-seed')
  }

  console.log(`[k6] setup complete: ${userCookies.length}/${population.users} users authenticated, ${apiKeys.length} API keys`)

  return { baseUrl, adminCookie, userCookies, apiKeys }
}
