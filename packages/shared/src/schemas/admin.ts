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
  id: z.string().max(255).optional(),
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

/** Zod schema for a member inside admin organization detail. */
const AdminOrganizationMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.iso.datetime(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable().optional(),
  }),
})

/** Zod schema for an invitation inside admin organization detail. */
const AdminOrganizationInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  expiresAt: z.iso.datetime(),
})

/** Full request/response schema for `GET /admin/organizations/:id`. */
export const GetAdminOrganizationByIdSchema = {
  params: z.object({ id: z.uuid() }),
  responses: {
    200: z.object({
      data: OrganizationSchema.extend({
        members: z.array(AdminOrganizationMemberSchema),
        invitations: z.array(AdminOrganizationInvitationSchema),
      }),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
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
  permissions: z.record(z.string(), z.array(z.string())).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type AdminApiKey = z.infer<typeof AdminApiKeySchema>

/** Query parameters for the admin API key list endpoint. */
export const AdminApiKeyQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  id: z.string().max(255).optional(),
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

/** Full request/response schema for `GET /admin/api-keys/:id`. */
export const GetAdminApiKeyByIdSchema = {
  params: z.object({ id: z.uuid() }),
  responses: {
    200: z.object({ data: AdminApiKeySchema }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
} as const

// ---------------------------------------------------------------------------
// Admin Users
// ---------------------------------------------------------------------------

/** Zod schema for a single user in admin responses. */
export const AdminUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  banned: z.boolean().nullable().optional(),
  banReason: z.string().nullable().optional(),
  banExpires: z.iso.datetime().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/** Zod schema for org membership in user detail. */
const AdminUserMembershipSchema = z.object({
  id: z.string(),
  role: z.string(),
  createdAt: z.iso.datetime(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
})

/** Zod schema for project in user detail. */
const AdminUserProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
})

/** Full request/response schema for `GET /admin/users/:id`. */
export const GetAdminUserByIdSchema = {
  params: z.object({ id: z.uuid() }),
  responses: {
    200: z.object({
      data: AdminUserSchema.extend({
        memberships: z.array(AdminUserMembershipSchema),
        projects: z.array(AdminUserProjectSchema),
        apiKeys: z.array(AdminApiKeySchema),
      }),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
} as const
