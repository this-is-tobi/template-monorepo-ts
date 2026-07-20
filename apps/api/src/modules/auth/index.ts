import type { AppModule } from '../types.js'
import { config } from '~/utils/config.js'
import { requireAuth, requireRole } from './middleware.js'
import { requirePermission } from './permissions.js'
import { getAuthRouter } from './router.js'

/**
 * Auth module — BetterAuth integration, session middleware, admin bootstrap.
 *
 * When enabled (`config.modules.auth`):
 * - Decorates the Fastify instance with `requireAuth` / `requireRole` / `requirePermission`
 * - Registers the `/api/v1/auth/*` catch-all route for BetterAuth
 * - Bootstraps the initial admin user on first startup (`onReady`)
 */
const authModule: AppModule = {
  name: 'auth',

  register: async (app) => {
    // Decorate app so every child route can reference app.requireAuth / app.requireRole / app.requirePermission
    app.decorate('requireAuth', requireAuth)
    app.decorate('requireRole', requireRole)
    app.decorate('requirePermission', requirePermission)

    // BetterAuth catch-all route (/api/v1/auth/*)
    await app.register(getAuthRouter())
  },

  onReady: async ({ logger }) => {
    // Guard: without Redis, several auth mechanisms are process-local —
    // pending OIDC org-membership sync, auth rate-limit counters, and the
    // org-permission cache. They degrade silently and incorrectly when the
    // API runs with more than one replica (e.g. HPA enabled in Helm).
    if (!config.auth.redis.url && !config.auth.redis.sentinelUrls) {
      logger.warn(
        'Redis is not configured for auth (AUTH__REDIS__URL / AUTH__REDIS__SENTINEL_URLS) — '
        + 'pending OIDC org-membership sync and rate limiting are per-replica. '
        + 'Run a single API replica, or configure Redis before enabling autoscaling.',
      )
    }

    const { bootstrapAdmin } = await import('./bootstrap.js')
    await bootstrapAdmin(logger)
  },
}

export default authModule
