import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

/**
 * Schema for an audit log entry (API output).
 */
export const AuditEntrySchema = z.object({
  id: z.uuid(),
  actorId: z.string().min(1),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.iso.datetime().optional(),
})

export type AuditEntry = z.infer<typeof AuditEntrySchema>

/**
 * Input for creating a new audit entry (omits auto-generated fields).
 */
export const CreateAuditEntrySchema = AuditEntrySchema.omit({ id: true, createdAt: true })

export type CreateAuditEntry = z.infer<typeof CreateAuditEntrySchema>

/**
 * Query parameters for filtering audit logs.
 */
export const AuditQuerySchema = z.object({
  actorId: z.string().max(255).optional(),
  resourceType: z.string().max(255).optional(),
  resourceId: z.string().max(255).optional(),
  action: z.string().max(255).optional(),
  after: z.iso.datetime().optional(),
  before: z.iso.datetime().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})

export type AuditQuery = z.infer<typeof AuditQuerySchema>

/**
 * GET /api/v1/audit — admin-only, returns paginated audit entries.
 */
export const GetAuditLogsSchema = {
  query: AuditQuerySchema,
  responses: {
    200: z.object({
      data: z.array(AuditEntrySchema),
      total: z.number(),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
} as const
