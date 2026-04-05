import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { UpdateApiKeySchema } from '../schemas/index.js'

/**
 * User-facing API key route definitions.
 */
export const apiKeyRoutes = {
  updateApiKey: {
    method: 'PUT',
    get path() { return `${apiPrefix.v1}/api-keys/:id` },
    summary: 'Update API key',
    description: 'Update an API key owned by the authenticated user.',
    tags: ['API Keys'],
    params: UpdateApiKeySchema.params,
    body: UpdateApiKeySchema.body,
    responses: UpdateApiKeySchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
