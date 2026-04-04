import { z } from 'zod'

/**
 * Typed schema for organization metadata stored in BetterAuth's
 * `organization.metadata` JSON column.
 *
 * All fields are optional — missing fields use application defaults.
 */
export const OrgMetadataSchema = z.object({
  /** Maximum number of projects allowed in this organization (`null` / absent = unlimited). */
  maxProjects: z.number().int().min(0).nullable().optional(),
  /** Whether this is a personal (auto-created) organization. */
  personal: z.boolean().optional(),
}).passthrough()

export type OrgMetadata = z.infer<typeof OrgMetadataSchema>

/**
 * Parse organization metadata from a raw JSON string.
 * Returns an empty object on invalid/null input (never throws).
 */
export function parseOrgMetadata(raw: string | null | undefined): OrgMetadata {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = OrgMetadataSchema.safeParse(parsed)
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}
