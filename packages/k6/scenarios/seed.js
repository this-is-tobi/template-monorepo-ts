// k6 script: seed the test user population via the BetterAuth admin HTTP API.
//
// Unlike the Bun-based seed (apps/api/scripts/seed-perf.ts), this script
// needs only HTTP access to the API — no direct DB connection.  It is meant
// for Kubernetes environments where `kubectl exec` may not be available
// (e.g. distroless production images).
//
// Usage:
//   k6 run packages/k6/scenarios/seed.js
//
// The script is idempotent: users that already exist (HTTP 422) are skipped.

import { check } from 'k6'
import { adminCreateUser, signInOrFail } from '../lib/auth.js'
import { getAdminCredentials, getBaseUrl, getPopulation } from '../lib/config.js'

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
  },
}

export default function () {
  const baseUrl = getBaseUrl()
  const admin = getAdminCredentials()
  const population = getPopulation()

  const prefix = (typeof __ENV !== 'undefined' && __ENV.K6_USER_EMAIL_PREFIX) || 'k6-user-'
  const domain = (typeof __ENV !== 'undefined' && __ENV.K6_USER_EMAIL_DOMAIN) || 'example.com'
  const password = (typeof __ENV !== 'undefined' && __ENV.K6_USER_PASSWORD) || 'k6-password-1234!'

  // Sign in as admin to get the session cookie.
  const adminCookie = signInOrFail(baseUrl, admin.email, admin.password)

  let created = 0
  let skipped = 0

  for (let i = 0; i < population.users; i++) {
    const email = `${prefix}${i}@${domain}`
    const res = adminCreateUser(baseUrl, adminCookie, {
      name: `k6-user-${i}`,
      email,
      password,
    })

    if (res.status === 200) {
      created++
    } else if (res.status === 400 || res.status === 422 || res.status === 409) {
      // User already exists — idempotent, all good.
      skipped++
    } else {
      console.warn(`[seed] unexpected status ${res.status} for ${email}: ${res.body}`)
    }
  }

  const ok = created + skipped === population.users
  check({ ok }, { 'all users seeded': ctx => ctx.ok })
  console.log(`[seed] done: ${created} created, ${skipped} already existed, ${population.users} total`)
}
