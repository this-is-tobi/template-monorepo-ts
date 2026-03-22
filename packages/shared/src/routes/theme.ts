import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetThemeSchema, UpdateThemeSchema } from '../schemas/index.js'

/**
 * Theme API route definitions
 */
export const themeRoutes = {
  getTheme: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/theme` },
    summary: 'Get theme',
    description: 'Retrieve the current theme configuration. Public endpoint — no authentication required.',
    tags: ['Theme'],
    responses: GetThemeSchema.responses,
  },

  updateTheme: {
    method: 'PUT',
    get path() { return `${apiPrefix.v1}/theme` },
    summary: 'Update theme',
    description: 'Update the theme configuration. Requires admin role.',
    tags: ['Theme'],
    body: UpdateThemeSchema.body,
    responses: UpdateThemeSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
