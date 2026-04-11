import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Session } from './auth.js'
import type { AppUser } from '~/utils/session.js'
import { parseApiKeyMetadata } from '@template-monorepo-ts/shared'
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
    /**
     * API key scope restrictions parsed from `metadata`.
     * Present only for API-key-authenticated requests.
     * `undefined` field = unrestricted for that dimension.
     */
    apiKeyScope?: {
      organizationIds?: Set<string>
      projectIds?: Set<string>
    }
    /** True when the request was authenticated via API key (vs session/cookie). */
    isApiKey?: boolean
    /**
     * Pre-parsed user roles from the session's comma-separated role string.
     * Populated by `requireAuth` so downstream middleware (e.g. `isAdmin`) is O(1).
     */
    parsedRoles?: Set<string>
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
      req.parsedRoles = parseRoles((session.user as AppUser | undefined)?.role)
      return
    }

    // Fallback: API key authentication
    const apiKey = req.headers['x-api-key'] as string | undefined
    if (apiKey) {
      const keySession = await resolveApiKeySession(req, apiKey)
      if (keySession) {
        req.session = keySession.session
        req.apiKeyPermissions = keySession.permissions
        req.apiKeyScope = keySession.scope
        req.isApiKey = true
        req.parsedRoles = parseRoles((keySession.session.user as AppUser | undefined)?.role)
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

/** Parse a comma-separated role string into a Set for O(1) lookups. */
function parseRoles(rawRole: string | undefined): Set<string> {
  if (!rawRole) return new Set()
  return new Set(rawRole.split(',').map(r => r.trim()))
}

/**
 * Helper — returns true when the authenticated user has the `admin` role.
 * Uses pre-parsed roles from `requireAuth` for O(1) lookups when available,
 * falls back to parsing the role string when called outside the request lifecycle.
 */
export function isAdmin(req: FastifyRequest): boolean {
  if (req.parsedRoles) return req.parsedRoles.has('admin')
  const rawRole = (req.session?.user as AppUser | undefined)?.role
  if (!rawRole) return false
  return rawRole.split(',').some(r => r.trim() === 'admin')
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

    const userRoles = req.parsedRoles ?? new Set<string>()
    const hasRole = roles.some(r => userRoles.has(r))
    if (!hasRole) {
      addReqLogs({
        req,
        message: 'forbidden — insufficient role',
        level: 'warn',
        infos: { requiredRoles: roles, userRoles: userRoles.size > 0 ? [...userRoles] : ['none'] },
      })
      reply.code(403).send({ message: 'Forbidden' })
    }
  }
}

// ---------------------------------------------------------------------------
// API key helpers
// ---------------------------------------------------------------------------

/**
 * Minimal API key session shape — only the fields used by permission
 * middleware are populated. The `role` field is intentionally omitted
 * so API-key requests never receive the platform-admin bypass.
 */
interface ApiKeySession {
  user: { id: string }
  session: { id: string, userId: string, activeOrganizationId?: string }
}

/**
 * Verify an API key and build a minimal session from the key metadata.
 *
 * The resulting session deliberately omits the `role` field so that
 * API-key-authenticated requests never receive the platform-admin bypass
 * in `requirePermission`. Permissions are scoped to those declared on the key.
 */
async function resolveApiKeySession(
  req: FastifyRequest,
  key: string,
): Promise<{ session: Session, permissions: Record<string, string[]> | null, scope?: { organizationIds?: Set<string>, projectIds?: Set<string> } } | null> {
  try {
    const result = await auth.api.verifyApiKey({ body: { key } })
    if (!result.key) return null

    const { id: keyId, referenceId, permissions: keyPermissions, metadata: keyMetadata } = result.key
    const meta = parseApiKeyMetadata(keyMetadata as string | null | undefined)

    // Use the first scoped org as default org context for the session.
    // Multi-org keys should rely on `getOrganizationId` in route handlers.
    const activeOrgId = meta.organizationIds?.[0]

    const apiKeySession: ApiKeySession = {
      user: { id: referenceId },
      session: {
        id: `apikey-${keyId}`,
        userId: referenceId,
        ...(activeOrgId ? { activeOrganizationId: activeOrgId } : {}),
      },
    }

    // Cast is safe: downstream code only accesses the fields populated above.
    // The Session type includes extra BetterAuth fields (token, expiresAt, etc.)
    // that are unused for API key auth.
    const session = apiKeySession as unknown as Session

    // Build scope restrictions from metadata
    const scope: { organizationIds?: Set<string>, projectIds?: Set<string> } = {}
    if (meta.organizationIds !== undefined) {
      scope.organizationIds = new Set(meta.organizationIds)
    }
    if (meta.projectIds !== undefined) {
      scope.projectIds = new Set(meta.projectIds)
    }

    return {
      session,
      permissions: keyPermissions ?? null,
      scope: Object.keys(scope).length > 0 ? scope : undefined,
    }
  } catch (error) {
    addReqLogs({ req, message: 'API key verification failed', error: error instanceof Error ? error : String(error), level: 'warn' })
    return null
  }
}
