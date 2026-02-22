import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetHealthzSchema, GetLivezSchema, GetReadyzSchema, GetVersionSchema } from '../schemas/index.js'

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
    description: 'Basic health check — confirms the server process is running.',
    tags: ['System'],
    responses: GetHealthzSchema.responses,
  },

  getReady: {
    method: 'GET',
    path: `${apiPrefix.v1}/readyz`,
    summary: 'Get readiness',
    description: 'Readiness check — verifies the service can handle traffic (database is reachable).',
    tags: ['System'],
    responses: GetReadyzSchema.responses,
  },

  getLive: {
    method: 'GET',
    path: `${apiPrefix.v1}/livez`,
    summary: 'Get liveness',
    description: 'Liveness check — confirms the process is not stuck or deadlocked.',
    tags: ['System'],
    responses: GetLivezSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
