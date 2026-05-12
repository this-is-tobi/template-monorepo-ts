import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

/**
 * Typed schema for API key metadata stored in BetterAuth's
 * `apikey.metadata` JSON column.
 */
export const ApiKeyMetadataSchema = z.object({
  /**
   * Organizations the key is scoped to.
   * - Absent / undefined → unrestricted (all user orgs).
   * - Empty array → deny all org-scoped resources.
   * - Non-empty array → allow only these orgs.
   */
  organizationIds: z.array(z.string()).optional(),
  /**
   * Projects the key is scoped to.
   * - Absent / undefined → unrestricted (all user projects).
   * - Empty array → deny all project-scoped resources.
   * - Non-empty array → allow only these projects.
   */
  projectIds: z.array(z.string()).optional(),
})

export type ApiKeyMetadata = z.infer<typeof ApiKeyMetadataSchema>

/**
 * Parse API key metadata from a raw JSON string or already-parsed object.
 * BetterAuth's verifyApiKey may return metadata as a parsed object.
 * Returns an empty object on invalid/null input (never throws).
 */
export function parseApiKeyMetadata(raw: string | Record<string, unknown> | null | undefined): ApiKeyMetadata {
  if (!raw) return {}
  try {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    const result = ApiKeyMetadataSchema.safeParse(parsed)
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// API key CRUD schemas
// ---------------------------------------------------------------------------

/** Schema for the API key object returned by the server. */
export const ApiKeySchema = z.object({
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

export type ApiKey = z.infer<typeof ApiKeySchema>

/** Body schema for updating an API key. */
const UpdateApiKeyBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.record(z.string(), z.array(z.string())).nullable().optional(),
  organizationIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
})

export const UpdateApiKeySchema = {
  params: z.object({
    id: z.uuid(),
  }),
  body: UpdateApiKeyBodySchema,
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: ApiKeySchema,
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export type UpdateApiKeyBody = z.infer<typeof UpdateApiKeySchema.body>
