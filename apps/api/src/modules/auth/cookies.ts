// ---------------------------------------------------------------------------
// BetterAuth cookie names — single source of truth.
//
// Kept in a side-effect-free module so consumers like the OpenAPI spec can
// import it without triggering BetterAuth bootstrap (which `auth.ts` does at
// module load).  When `advanced.cookiePrefix` is overridden in `auth.ts`, this
// constant MUST be updated to match — BetterAuth's cookie name is derived as
// `${cookiePrefix}.session_token`.
// ---------------------------------------------------------------------------

/** BetterAuth cookie prefix.  Matches the default (no `advanced.cookiePrefix` override). */
export const AUTH_COOKIE_PREFIX = 'better-auth'

/** Session cookie name set by BetterAuth. */
export const SESSION_COOKIE_NAME = `${AUTH_COOKIE_PREFIX}.session_token`
