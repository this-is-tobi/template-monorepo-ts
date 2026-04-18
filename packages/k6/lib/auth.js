// BetterAuth flow helpers used by k6 setup() and weighted journeys.
//
// All requests carry an `Origin` header that matches the API base URL
// because BetterAuth checks `trustedOrigins` for cookie issuance.

import { check, fail } from 'k6'
import http from 'k6/http'
import { jsonHeaders, uniqueSuffix } from './config.js'

/**
 * Sign in via BetterAuth's email+password endpoint.
 * Returns the session cookie string on success, or null on failure (non-throwing).
 * Use in setup() loops where individual failures should be skipped rather than aborting the run.
 */
export function signIn(baseUrl, email, password) {
  const res = http.post(
    `${baseUrl}/api/v1/auth/sign-in/email`,
    JSON.stringify({ email, password }),
    {
      headers: { ...jsonHeaders, Origin: baseUrl },
      tags: { endpoint: 'auth_sign_in', journey: 'auth' },
    },
  )
  if (res.status !== 200) {
    console.warn(`[k6] sign-in failed for ${email}: status=${res.status}`)
    return null
  }
  // BetterAuth sets a session cookie via Set-Cookie; the cookie jar already
  // has it, but for explicit reuse we extract the token value.
  const setCookie = res.headers['Set-Cookie'] || ''
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Sign in and hard-fail the entire run if login is unsuccessful.
 * Use only for the admin user whose credentials are operator-supplied.
 */
export function signInOrFail(baseUrl, email, password) {
  const cookie = signIn(baseUrl, email, password)
  if (!cookie) {
    fail(`sign-in failed for ${email} — check K6_ADMIN_EMAIL / K6_ADMIN_PASSWORD`)
  }
  // Emit a check so the sign-in appears in the Grafana check-failure panel.
  check({ cookie }, { 'admin sign-in ok': ctx => Boolean(ctx.cookie) })
  return cookie
}

/**
 * Create a user via the BetterAuth admin API. Bypasses the
 * `enableRegistration` setting — only callable when authenticated as
 * an admin. Used by setup() to mint a deterministic user pool.
 */
export function adminCreateUser(baseUrl, adminCookie, { name, email, password }) {
  const res = http.post(
    `${baseUrl}/api/v1/auth/admin/create-user`,
    JSON.stringify({ name, email, password }),
    {
      headers: { ...jsonHeaders, Origin: baseUrl, Cookie: `better-auth.session_token=${adminCookie}` },
      tags: { endpoint: 'auth_admin_create_user', journey: 'admin' },
    },
  )
  // 200 (created) or 422 (already exists) are both fine for idempotent setup.
  return res
}

/**
 * Mint an API key for a signed-in user. Returns the plaintext key (only
 * available right after creation).
 */
export function createApiKey(baseUrl, sessionCookie, name = `k6-${uniqueSuffix()}`) {
  const res = http.post(
    `${baseUrl}/api/v1/auth/api-key/create`,
    JSON.stringify({ name }),
    {
      headers: { ...jsonHeaders, Origin: baseUrl, Cookie: `better-auth.session_token=${sessionCookie}` },
      tags: { endpoint: 'auth_apikey_create', journey: 'auth' },
    },
  )
  if (res.status !== 200) return null
  try {
    return res.json('key')
  } catch (_e) {
    return null
  }
}

/**
 * Build the headers object for a request authenticated with a session cookie.
 */
export function cookieAuth(baseUrl, sessionCookie, extraTags = {}) {
  return {
    headers: {
      Origin: baseUrl,
      Cookie: `better-auth.session_token=${sessionCookie}`,
    },
    tags: { auth: 'cookie', ...extraTags },
  }
}

/**
 * Build the headers object for a request authenticated with an API key.
 */
export function apiKeyAuth(apiKey, extraTags = {}) {
  return {
    headers: { 'x-api-key': apiKey },
    tags: { auth: 'apikey', ...extraTags },
  }
}
