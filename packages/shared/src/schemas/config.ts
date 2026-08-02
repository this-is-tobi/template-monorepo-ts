import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

/**
 * Platform-level application configuration persisted by the API.
 *
 * Platform-admin write. Public read (the login page needs to know whether
 * registration is enabled before anyone is authenticated).
 *
 * This is the **runtime policy** tier of the config model: values live in the
 * database, are editable from the admin UI, and take effect without a
 * restart. Boot-time infrastructure (database URL, ports, secrets, which
 * modules to register) is intentionally NOT here — see `docs/03-configuration.md`.
 *
 * Any field may be pinned by an operator through `PLATFORM__*` env vars or the
 * `platform` section of the config file, in which case it is reported in
 * `lockedFields` and the UI renders it read-only.
 *
 * @property enableRegistration – Whether new user sign-ups are allowed.
 * @property auditRetentionDays – Days to keep audit entries; `0` keeps forever.
 */
export const AppConfigSchema = z.object({
  enableRegistration: z.boolean().default(true),
  allowOrganizationCreation: z.boolean().default(true),
  appName: z.string().default('Template Monorepo TS'),
  documentationUrl: z.url().or(z.literal('')).default(''),
  maintenanceMode: z.boolean().default(false),
  maxOrganizationsPerUser: z.number().int().min(0).nullable().default(null),
  maxProjectsPerOrg: z.number().int().min(0).nullable().default(null),
  auditRetentionDays: z.number().int().min(0).default(0),
})

export type AppConfig = z.infer<typeof AppConfigSchema>

/**
 * GET /api/v1/config — public, no auth required.
 *
 * Includes the server-computed sign-in methods (`ssoProviders`,
 * `emailPasswordEnabled`), which are boot config rather than persisted
 * settings. The login page needs both before anyone is authenticated —
 * offering a password form on an SSO-only instance would be a dead end.
 */
export const GetAppConfigSchema = {
  responses: {
    200: z.object({
      data: AppConfigSchema,
      ssoProviders: z.array(z.string()).default([]),
      /** Whether local email + password sign-in is available at all. */
      emailPasswordEnabled: z.boolean().default(true),
      lockedFields: z.array(z.string()).default([]),
    }),
    500: ErrorSchema,
  },
} as const

/**
 * PUT /api/v1/config — platform admin only.
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

/**
 * One resolved server config option.
 *
 * Read-only introspection of the **boot-time** config tier: what the server
 * actually resolved, and which layer won. Lets an operator answer "did my env
 * var land?" without shell access to the container.
 */
export const RuntimeConfigEntrySchema = z.object({
  /** Dot path into the config object (e.g. `server.rateLimit.max`). */
  path: z.string(),
  /** Environment variable that sets it (e.g. `SERVER__RATE_LIMIT__MAX`). */
  envVar: z.string(),
  /**
   * Effective value, stringified for display. Always `null` for secrets —
   * use `isSet` to tell "configured" from "empty".
   */
  value: z.string().nullable(),
  /** Which layer supplied the value. Env beats file beats the schema default. */
  source: z.enum(['env', 'file', 'default']),
  /** Whether the value is withheld because it is a secret. */
  secret: z.boolean(),
  /** Whether a non-empty value is configured. */
  isSet: z.boolean(),
})

export type RuntimeConfigEntry = z.infer<typeof RuntimeConfigEntrySchema>

/**
 * GET /api/v1/config/runtime — platform admin only.
 *
 * Exposes deployment topology (hosts, issuers, pool sizes), so it is
 * deliberately not readable by org admins, and secret values are never
 * included in the payload.
 */
export const GetRuntimeConfigSchema = {
  responses: {
    200: z.object({
      entries: z.array(RuntimeConfigEntrySchema),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
} as const
