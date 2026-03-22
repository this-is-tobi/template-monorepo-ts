import type { FastifyInstance } from 'fastify'
import { getAuditRouter } from './audit/index.js'
import { getConfigRouter } from './config/index.js'
import { getProjectRouter } from './projects/index.js'
import { getSystemRouter } from './system/index.js'
import { getThemeRouter } from './theme/index.js'

/**
 * Returns a function that registers all core API routers (system, projects, theme, config, audit) to the Fastify app.
 * Auth routes are registered separately via the auth module.
 *
 * @returns {function(FastifyInstance): Promise<void>} Function to register routers
 */
export function getApiRouter() {
  return async (app: FastifyInstance) => {
    await app.register(getSystemRouter())
    await app.register(getProjectRouter())
    await app.register(getThemeRouter())
    await app.register(getConfigRouter())
    await app.register(getAuditRouter())
  }
}
