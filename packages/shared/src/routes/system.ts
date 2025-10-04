import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetHealthzSchema, GetVersionSchema } from '../schemas/index.js'

/**
 * System API route definitions
 */
export const systemRoutes = {
  getVersion: {
    method: 'GET',
    path: `${apiPrefix.v1}/version`,
    summary: 'Get version',
    description: 'Retrieve api version.',
    tags: ['System'],
    responses: GetVersionSchema.responses,
  },

  getHealth: {
    method: 'GET',
    path: `${apiPrefix.v1}/healthz`,
    summary: 'Get health',
    description: 'Retrieve api health infos.',
    tags: ['System'],
    responses: GetHealthzSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
