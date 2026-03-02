import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod schemas for Audit API contracts
// ---------------------------------------------------------------------------

/**
 * Schema for an audit log entry.
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

export type AuditEntryOutput = z.infer<typeof AuditEntrySchema>

/**
 * Schema for creating an audit entry (API input).
 */
export const CreateAuditEntrySchema = z.object({
  actorId: z.string().min(1),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
})

/**
 * Schema for querying audit logs.
 */
export const AuditQuerySchema = z.object({
  actorId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  after: z.iso.datetime().optional(),
  before: z.iso.datetime().optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().min(0).default(0),
})
