import type { FastifyInstance } from 'fastify'
import { getProjectRouter } from './projects/index.js'
import { getSystemRouter } from './system/index.js'

/**
 * Returns a function that registers all core API routers (system, projects) to the Fastify app.
 * Auth routes are registered separately via the auth module.
 *
 * @returns {function(FastifyInstance): Promise<void>} Function to register routers
 */
export function getApiRouter() {
  return async (app: FastifyInstance) => {
    await app.register(getSystemRouter())
    await app.register(getProjectRouter())
  }
}
