import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

/**
 * Platform-level application configuration persisted by the API.
 *
 * Admin-only write. Public read (login page needs to know if registration is enabled).
 *
 * @property enableRegistration – Whether new user sign-ups are allowed.
 */
export const AppConfigSchema = z.object({
  enableRegistration: z.boolean().default(true),
  allowOrganizationCreation: z.boolean().default(true),
  appName: z.string().default('Template Monorepo TS'),
  documentationUrl: z.url().or(z.literal('')).default(''),
  maintenanceMode: z.boolean().default(false),
  maxOrganizationsPerUser: z.number().int().min(0).nullable().default(null),
})

export type AppConfig = z.infer<typeof AppConfigSchema>

/**
 * GET /api/v1/config — public, no auth required.
 * Includes server-computed `ssoProviders` (not persisted).
 */
export const GetAppConfigSchema = {
  responses: {
    200: z.object({
      data: AppConfigSchema,
      ssoProviders: z.array(z.string()).default([]),
    }),
    500: ErrorSchema,
  },
} as const

/**
 * PUT /api/v1/config — admin-only.
 */
export const UpdateAppConfigSchema = {
  body: AppConfigSchema,
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: AppConfigSchema,
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
} as const
