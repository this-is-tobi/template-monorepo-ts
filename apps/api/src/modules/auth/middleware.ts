import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Session } from './auth.js'
import { addReqLogs } from '~/utils/logger.js'
import { auth } from './auth.js'
import { toHeaders } from './headers.js'

// ---- Fastify augmentation for `req.session` --------------------------------
declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by `requireAuth` / `requireRole` when auth module is enabled. */
    session?: Session
    /**
     * When the request is authenticated via API key, this holds the key's
     * declared permissions (parsed from the JSON `permissions` column).
     * Used by `requirePermission` to authorise without a second DB round-trip.
     */
    apiKeyPermissions?: Record<string, string[]> | null
  }
}

/**
 * Fastify preHandler — requires a valid session (cookie or Bearer token).
 * Falls back to API key verification when `x-api-key` header is present and
 * no session exists.
 *
 * On success the session is attached at `request.session`.
 * For API key auth, `request.apiKeyPermissions` is also populated.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const session = await auth.api.getSession({ headers: toHeaders(req.headers) })
    if (session) {
      req.session = session
      return
    }

    // Fallback: API key authentication
    const apiKey = req.headers['x-api-key'] as string | undefined
    if (apiKey) {
      const keySession = await resolveApiKeySession(apiKey)
      if (keySession) {
        req.session = keySession.session
        req.apiKeyPermissions = keySession.permissions
        return
      }
    }

    addReqLogs({ req, message: 'unauthorized access attempt', level: 'warn' })
    reply.code(401).send({ message: 'Unauthorized' })
  } catch (error) {
    addReqLogs({ req, message: 'auth session resolution failed', error: error instanceof Error ? error : String(error) })
    reply.code(401).send({ message: 'Unauthorized' })
  }
}

/**
 * Helper — returns true when the authenticated user has the `admin` role.
 * Supports comma-separated multi-role values (e.g. `"user,admin"`).
 * Must be called after `requireAuth` / `requireRole` has run.
 */
export function isAdmin(req: FastifyRequest): boolean {
  const rawRole = (req.session?.user as Record<string, unknown> | undefined)?.role as string | undefined
  const userRoles = rawRole ? rawRole.split(',').map(r => r.trim()) : []
  return userRoles.includes('admin')
}

/**
 * Factory — returns a preHandler that requires one of the given roles.
 * Must be chained after (or wraps) `requireAuth`.
 *
 * Supports comma-separated multi-role values (e.g. `"user,admin"`) which
 * occur when roles are mapped from an external OIDC provider.
 */
export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply)
    if (reply.sent) return

    const rawRole = (req.session?.user as Record<string, unknown> | undefined)?.role as string | undefined
    const userRoles = rawRole ? rawRole.split(',').map(r => r.trim()) : []
    const hasRole = userRoles.some(r => roles.includes(r))
    if (!hasRole) {
      addReqLogs({
        req,
        message: 'forbidden — insufficient role',
        level: 'warn',
        infos: { requiredRoles: roles, userRoles: userRoles.length > 0 ? userRoles : ['none'] },
      })
      reply.code(403).send({ message: 'Forbidden' })
    }
  }
}

// ---------------------------------------------------------------------------
// API key helpers
// ---------------------------------------------------------------------------

/**
 * Verify an API key and build a minimal session from the key metadata.
 *
 * The resulting session deliberately omits the `role` field so that
 * API-key-authenticated requests never receive the platform-admin bypass
 * in `requirePermission`. Permissions are scoped to those declared on the key.
 */
async function resolveApiKeySession(
  key: string,
): Promise<{ session: Session, permissions: Record<string, string[]> | null } | null> {
  try {
    const result = await auth.api.verifyApiKey({ body: { key } })
    if (!result.key) return null

    const { id: keyId, referenceId, permissions: keyPermissions } = result.key

    const session = {
      user: { id: referenceId },
      session: {
        id: `apikey-${keyId}`,
        userId: referenceId,
      },
    } as unknown as Session

    return { session, permissions: keyPermissions ?? null }
  } catch {
    return null
  }
}
