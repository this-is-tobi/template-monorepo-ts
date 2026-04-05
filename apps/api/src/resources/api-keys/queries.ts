import { db } from '~/prisma/clients.js'

/** Fetch a single API key by ID (excludes the key hash). */
export async function getApiKeyByIdQuery(id: string) {
  return db.apiKey.findUnique({
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
