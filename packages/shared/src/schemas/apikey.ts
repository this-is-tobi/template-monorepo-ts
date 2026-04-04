import { z } from 'zod'

/**
 * Typed schema for API key metadata stored in BetterAuth's
 * `apikey.metadata` JSON column.
 */
export const ApiKeyMetadataSchema = z.object({
  /** Organization the key is scoped to (absent = global / admin key). */
  organizationId: z.string().optional(),
}).passthrough()

export type ApiKeyMetadata = z.infer<typeof ApiKeyMetadataSchema>

/**
 * Parse API key metadata from a raw JSON string.
 * Returns an empty object on invalid/null input (never throws).
 */
export function parseApiKeyMetadata(raw: string | null | undefined): ApiKeyMetadata {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = ApiKeyMetadataSchema.safeParse(parsed)
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}
