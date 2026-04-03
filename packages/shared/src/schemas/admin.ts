import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

// ---------------------------------------------------------------------------
// Shared pagination + date-range fields
// ---------------------------------------------------------------------------

/** Pagination query params shared by all admin list endpoints. */
const PaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})

/** Optional date-range filters for list endpoints. */
const DateRangeSchema = z.object({
  after: z.iso.datetime().optional(),
  before: z.iso.datetime().optional(),
})

// ---------------------------------------------------------------------------
// Admin Organizations
// ---------------------------------------------------------------------------

/** Zod schema for a single organization in admin responses. */
export const OrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
  memberCount: z.number().optional(),
})

export type AdminOrganization = z.infer<typeof OrganizationSchema>

/** Query parameters for the admin organization list endpoint. */
export const AdminOrganizationQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  name: z.string().max(255).optional(),
  slug: z.string().max(255).optional(),
})

export type AdminOrganizationQuery = z.infer<typeof AdminOrganizationQuerySchema>

/** Full request/response schema for `GET /admin/organizations`. */
export const GetAdminOrganizationsSchema = {
  query: AdminOrganizationQuerySchema,
  responses: {
    200: z.object({ data: z.array(OrganizationSchema), total: z.number() }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
} as const

// ---------------------------------------------------------------------------
// Admin API Keys
// ---------------------------------------------------------------------------

/** Zod schema for a single API key in admin responses. */
export const AdminApiKeySchema = z.object({
  id: z.uuid(),
  configId: z.string(),
  name: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  prefix: z.string().nullable().optional(),
  referenceId: z.string(),
  enabled: z.boolean(),
  permissions: z.string().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type AdminApiKey = z.infer<typeof AdminApiKeySchema>

/** Query parameters for the admin API key list endpoint. */
export const AdminApiKeyQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  name: z.string().max(255).optional(),
  referenceId: z.string().max(255).optional(),
  enabled: z.enum(['true', 'false']).optional(),
})

export type AdminApiKeyQuery = z.infer<typeof AdminApiKeyQuerySchema>

/** Full request/response schema for `GET /admin/api-keys`. */
export const GetAdminApiKeysSchema = {
  query: AdminApiKeyQuerySchema,
  responses: {
    200: z.object({ data: z.array(AdminApiKeySchema), total: z.number() }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
} as const
