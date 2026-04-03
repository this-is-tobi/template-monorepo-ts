import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import {
  GetAdminApiKeysSchema,
  GetAdminOrganizationsSchema,
} from '../schemas/index.js'

/** Admin route definitions — requires the `admin` role. */
export const adminRoutes = {
  getAdminOrganizations: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/admin/organizations` },
    summary: 'List all organizations (admin)',
    description: 'Retrieve all organizations with pagination and filters. Requires admin role.',
    tags: ['Admin'],
    query: GetAdminOrganizationsSchema.query,
    responses: GetAdminOrganizationsSchema.responses,
  },

  getAdminApiKeys: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/admin/api-keys` },
    summary: 'List all API keys (admin)',
    description: 'Retrieve all API keys with pagination and filters. Requires admin role.',
    tags: ['Admin'],
    query: GetAdminApiKeysSchema.query,
    responses: GetAdminApiKeysSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
