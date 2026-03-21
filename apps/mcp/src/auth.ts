import { createAuthenticatedClient } from '@template-monorepo-ts/shared'

// ---------------------------------------------------------------------------
// Auth result type
// ---------------------------------------------------------------------------

/**
 * Result of a successful authentication — the resolved user identity
 * and the credentials to forward when calling the API on their behalf.
 */
export interface AuthResult {
  /** API user ID. */
  userId: string
  /** User display name (for logging). */
  name: string
  /** Auth method used (`"bearer"` or `"apiKey"`). */
  method: 'bearer' | 'apiKey'
  /** The credential value (token or API key) to forward to the API. */
  credential: string
}

// ---------------------------------------------------------------------------
// Auth validation
// ---------------------------------------------------------------------------

/**
 * Extract credentials from a web-standard `Request` and validate them against the API.
 *
 * Checks (in priority order):
 * 1. `Authorization: Bearer <token>` — resolves session via API's `/auth/get-session`
 * 2. `x-api-key: <key>` — resolves session via API's `/auth/get-session`
 *
 * The validation creates a temporary `ApiClient` with the caller's credentials
 * and calls `auth.getSession()`. If the API returns a valid session, the user
 * identity is extracted and returned.
 *
 * @param req   Web-standard Request object
 * @param serverUrl  Base URL of the API server
 * @returns `AuthResult` on success, `undefined` on failure
 */
export async function validateAuth(
  req: Request,
  serverUrl: string,
): Promise<AuthResult | undefined> {
  const authHeader = req.headers.get('authorization')
  const apiKeyHeader = req.headers.get('x-api-key')

  if (!authHeader && !apiKeyHeader) {
    return undefined
  }

  // Extract bearer token
  let token: string | undefined
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token && !apiKeyHeader) {
    return undefined
  }

  try {
    // Create a temporary client with the caller's credentials
    const client = createAuthenticatedClient({
      serverUrl,
      token,
      apiKey: apiKeyHeader ?? undefined,
    })

    const response = await client.auth.getSession()
    const session = response.data as {
      session?: { userId?: string }
      user?: { id?: string, name?: string }
    }

    const userId = session?.user?.id ?? session?.session?.userId
    if (!userId) return undefined

    return {
      userId,
      name: session?.user?.name ?? 'unknown',
      method: token ? 'bearer' : 'apiKey',
      credential: (token ?? apiKeyHeader)!,
    }
  } catch {
    return undefined
  }
}

/**
 * Create a JSON error `Response` (web-standard).
 */
export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status })
}
