import type { AppModule } from '../types.js'
import { requireAuth, requireRole } from './middleware.js'
import { getAuthRouter } from './router.js'

/**
 * Auth module — BetterAuth integration, session middleware, admin bootstrap.
 *
 * When enabled (`config.modules.auth`):
 * - Decorates the Fastify instance with `requireAuth` / `requireRole`
 * - Registers the `/api/v1/auth/*` catch-all route for BetterAuth
 * - Bootstraps the initial admin user on first startup (`onReady`)
 */
const authModule: AppModule = {
  name: 'auth',

  register: async (app) => {
    // Decorate app so every child route can reference app.requireAuth / app.requireRole
    app.decorate('requireAuth', requireAuth)
    app.decorate('requireRole', requireRole)

    // BetterAuth catch-all route (/api/v1/auth/*)
    await app.register(getAuthRouter())
  },

  onReady: async ({ logger }) => {
    const { bootstrapAdmin } = await import('./bootstrap.js')
    await bootstrapAdmin(logger)
  },
}

export default authModule
