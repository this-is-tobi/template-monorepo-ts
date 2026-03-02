import type { FastifyInstance } from 'fastify'
import { getSystemRouter } from './system/index.js'
import { getUserRouter } from './users/index.js'

/**
 * Returns a function that registers all core API routers (system, users) to the Fastify app.
 * Auth routes are registered separately via the auth module.
 *
 * @returns {function(FastifyInstance): Promise<void>} Function to register routers
 */
export function getApiRouter() {
  return async (app: FastifyInstance) => {
    await app.register(getSystemRouter())
    await app.register(getUserRouter())
  }
}
