import { db, dbRo } from '~/prisma/clients.js'

/** Fetch a single API key by ID (excludes the key hash). */
export async function getApiKeyByIdQuery(id: string) {
  return dbRo.apiKey.findUnique({
    where: { id },
    omit: { key: true },
  })
}

/** Update an API key's mutable fields. */
export async function updateApiKeyQuery(
  id: string,
  data: { name?: string, permissions?: string | null, metadata?: string | null },
) {
  return db.apiKey.update({
    where: { id },
    data,
    omit: { key: true },
  })
}

/**
 * Validate that a user has access to the given organization and project IDs.
 * Returns `{ valid: true }` when all IDs are accessible, or
 * `{ valid: false, reason: string }` with details about the first violation.
 */
export async function validateApiKeyScope(
  userId: string,
  organizationIds?: string[],
  projectIds?: string[],
): Promise<{ valid: true } | { valid: false, reason: string }> {
  if (organizationIds && organizationIds.length > 0) {
    const memberCount = await db.member.count({
      where: { userId, organizationId: { in: organizationIds } },
    })
    if (memberCount !== organizationIds.length) {
      return { valid: false, reason: 'One or more organization IDs are not accessible' }
    }
  }

  if (projectIds && projectIds.length > 0) {
    const projectMemberCount = await db.projectMember.count({
      where: { userId, projectId: { in: projectIds } },
    })
    if (projectMemberCount !== projectIds.length) {
      return { valid: false, reason: 'One or more project IDs are not accessible' }
    }
  }

  return { valid: true }
}
