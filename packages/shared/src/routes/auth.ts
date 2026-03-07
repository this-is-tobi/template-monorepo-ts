import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetSessionSchema, SignInEmailSchema } from '../schemas/index.js'

/**
 * BetterAuth API route definitions.
 * Wraps the most commonly used auth endpoints for type-safe client access.
 */
export const authRoutes = {
  signIn: {
    method: 'POST',
    path: `${apiPrefix.v1}/auth/sign-in/email`,
    summary: 'Sign in with email',
    description: 'Authenticate with email and password via BetterAuth.',
    tags: ['Auth'],
    body: SignInEmailSchema.body,
    responses: SignInEmailSchema.responses,
  },

  getSession: {
    method: 'GET',
    path: `${apiPrefix.v1}/auth/get-session`,
    summary: 'Get session',
    description: 'Retrieve the current authenticated session.',
    tags: ['Auth'],
    responses: GetSessionSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
