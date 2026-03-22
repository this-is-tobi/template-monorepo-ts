import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetAppConfigSchema, UpdateAppConfigSchema } from '../schemas/index.js'

/**
 * App configuration API route definitions
 */
export const configRoutes = {
  getConfig: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/config` },
    summary: 'Get app configuration',
    description: 'Retrieve the current application configuration. Public endpoint — no authentication required.',
    tags: ['Config'],
    responses: GetAppConfigSchema.responses,
  },

  updateConfig: {
    method: 'PUT',
    get path() { return `${apiPrefix.v1}/config` },
    summary: 'Update app configuration',
    description: 'Update the application configuration. Requires admin role.',
    tags: ['Config'],
    body: UpdateAppConfigSchema.body,
    responses: UpdateAppConfigSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
