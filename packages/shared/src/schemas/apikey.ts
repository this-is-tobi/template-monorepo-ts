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
 *
 * Returns `{}` when there is no metadata at all, and `null` when metadata is
 * present but cannot be read. Never throws.
 *
 * Those two outcomes must not collapse into one. `{}` is the documented
 * "unrestricted" state (see the field docs above), so answering it for a value
 * that failed to parse turns one malformed field into a key whose declared
 * permissions apply in every organization on the instance — and the metadata
 * scope is the only tenant boundary a permissioned key has. Callers therefore
 * read `null` as a reason to refuse the key, never as an empty scope.
 */
export function parseApiKeyMetadata(raw: string | Record<string, unknown> | null | undefined): ApiKeyMetadata | null {
  if (!raw) return {}
  try {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    const result = ApiKeyMetadataSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
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
