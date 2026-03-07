import { z } from 'zod'
import { ErrorSchema, UnauthorizedSchema } from './utils.js'

/**
 * Schema for POST /api/auth/sign-in/email
 * BetterAuth email/password sign-in with bearer token response.
 */
export const SignInEmailSchema = {
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
  responses: {
    200: z.looseObject({
      token: z.string().optional(),
      user: z.looseObject({
        id: z.string(),
        email: z.string(),
        name: z.string(),
      }).optional(),
    }),
    401: UnauthorizedSchema,
    500: ErrorSchema,
  },
}

/**
 * Schema for GET /api/auth/get-session
 * BetterAuth session retrieval.
 */
export const GetSessionSchema = {
  responses: {
    200: z.looseObject({
      session: z.looseObject({
        id: z.string(),
        userId: z.string(),
      }),
      user: z.looseObject({
        id: z.string(),
        email: z.string(),
        name: z.string(),
      }),
    }),
    401: UnauthorizedSchema,
    500: ErrorSchema,
  },
}
