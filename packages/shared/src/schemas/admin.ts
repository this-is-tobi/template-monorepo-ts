import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

// ---------------------------------------------------------------------------
// Shared pagination + date-range fields
// ---------------------------------------------------------------------------

const PaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const DateRangeSchema = z.object({
  after: z.iso.datetime().optional(),
  before: z.iso.datetime().optional(),
})

// ---------------------------------------------------------------------------
// Admin Organizations
// ---------------------------------------------------------------------------

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

export const AdminOrganizationQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  name: z.string().optional(),
  slug: z.string().optional(),
})

export type AdminOrganizationQuery = z.infer<typeof AdminOrganizationQuerySchema>

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

export const AdminApiKeyQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  name: z.string().optional(),
  referenceId: z.string().optional(),
  enabled: z.enum(['true', 'false']).optional(),
})

export type AdminApiKeyQuery = z.infer<typeof AdminApiKeyQuerySchema>

export const GetAdminApiKeysSchema = {
  query: AdminApiKeyQuerySchema,
  responses: {
    200: z.object({ data: z.array(AdminApiKeySchema), total: z.number() }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
} as const
