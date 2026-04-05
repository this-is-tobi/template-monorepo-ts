import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import {
  GetAdminApiKeyByIdSchema,
  GetAdminApiKeysSchema,
  GetAdminOrganizationByIdSchema,
  GetAdminOrganizationsSchema,
  GetAdminUserByIdSchema,
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

  getAdminOrganizationById: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/admin/organizations/:id` },
    summary: 'Get a single organization with members (admin)',
    description: 'Retrieve a single organization by ID with members and invitations. Requires admin role.',
    tags: ['Admin'],
    params: GetAdminOrganizationByIdSchema.params,
    responses: GetAdminOrganizationByIdSchema.responses,
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

  getAdminApiKeyById: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/admin/api-keys/:id` },
    summary: 'Get a single API key (admin)',
    description: 'Retrieve a single API key by ID. Requires admin role.',
    tags: ['Admin'],
    params: GetAdminApiKeyByIdSchema.params,
    responses: GetAdminApiKeyByIdSchema.responses,
  },

  getAdminUserById: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/admin/users/:id` },
    summary: 'Get a single user with related resources (admin)',
    description: 'Retrieve a user by ID with their organizations, projects, and API keys. Requires admin role.',
    tags: ['Admin'],
    params: GetAdminUserByIdSchema.params,
    responses: GetAdminUserByIdSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
