import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from '~/utils/logger.js'
import { getActiveOrgId, getUserId } from '~/utils/session.js'
import { isAdmin } from './middleware.js'

// ---------------------------------------------------------------------------
// requirePermission — unified permission middleware
//
// Resolution order:
//  1. Platform admin bypass  (user.role includes 'admin')
//  1b. Resolve org ID        (once, reused in scope + role checks)
//  1c. API key scope check   (org + project restrictions from metadata)
//  2. API key permissions    (cached from requireAuth)
//  3. Org-level role check   (BetterAuth organisation membership)
//  4. Project-member role    (getProjectMemberRole callback)
//  5. Ownership fallback     (resource owner === current user)
//  6. Deny
//
// Audit logging is emitted via `app.auditLogger?.logAsync()` when available.
// ---------------------------------------------------------------------------

/**
 * Full options for `requirePermission`.
 */
export interface RequirePermissionOptions {
  /** Resource → actions to check (e.g. `{ project: ['create'] }`). */
  permissions: Record<string, string[]>
  /**
   * Extract the org ID from the request.
   * Falls back to `session.session.activeOrganizationId` when not provided.
   */
  getOrganizationId?: (req: FastifyRequest) => Promise<string | undefined> | string | undefined
  /**
   * Extract the project ID from the request.
   * Used for API key project-scope enforcement.
   */
  getProjectId?: (req: FastifyRequest) => string | undefined
  /**
   * Extract the resource owner ID from the request.
   * When provided and matching the current user, ownership grants the action.
   */
  getOwnerId?: (req: FastifyRequest) => Promise<string | undefined> | string | undefined
  /** Actions that ownership alone can grant (default: `['read', 'update', 'delete']`). */
  ownershipActions?: string[]
  /**
   * Extract the user's project-member role from the request.
   * When provided, the role is mapped to allowed actions (additive to org roles).
   */
  getProjectMemberRole?: (req: FastifyRequest) => Promise<string | undefined> | string | undefined
}

const DEFAULT_OWNERSHIP_ACTIONS = ['read', 'update', 'delete']

/**
 * Project-member role → allowed actions mapping.
 * Used when `getProjectMemberRole` is provided.
 */
const PROJECT_MEMBER_ROLE_ACTIONS: Record<string, string[]> = {
  owner: ['create', 'read', 'update', 'delete'],
  admin: ['read', 'update', 'delete'],
  member: ['read', 'update'],
  viewer: ['read'],
}

/**
 * Normalise the shorthand `Record<string, string[]>` into full options.
 */
function normaliseOptions(
  opts: RequirePermissionOptions | Record<string, string[]>,
): RequirePermissionOptions {
  if ('permissions' in opts) return opts as RequirePermissionOptions
  return { permissions: opts as Record<string, string[]> }
}

/**
 * Factory — returns a Fastify preHandler that checks permissions.
 *
 * Must be used **after** `requireAuth` in the preHandler chain so that
 * `req.session` is populated.
 *
 * @example
 * // Simple org-level check
 * app.requirePermission({ project: ['create'] })
 *
 * // With ownership fallback
 * app.requirePermission({
 *   permissions: { project: ['read'] },
 *   getOwnerId: async (req) => (await getProject(req.params.id))?.ownerId,
 * })
 */
export function requirePermission(
  optsOrPermissions: RequirePermissionOptions | Record<string, string[]>,
) {
  const opts = normaliseOptions(optsOrPermissions)
  const ownershipActions = opts.ownershipActions ?? DEFAULT_OWNERSHIP_ACTIONS

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.session?.user) {
      reply.code(401).send({ message: 'Unauthorized' })
      return
    }

    const userId = getUserId(req)!
    const app = req.server

    // ── 1. Platform admin bypass ──────────────────────────────────────
    if (isAdmin(req)) {
      return
    }

    // ── 1b. Resolve org ID (once, reused in scope + role checks) ─────
    const orgId = await opts.getOrganizationId?.(req)
      ?? getActiveOrgId(req)

    // ── 1c. API key scope enforcement ─────────────────────────────────
    // When an API key has org/project scope restrictions, verify the
    // target resource falls within the allowed scope BEFORE checking
    // permissions — this prevents privilege escalation via broad perms.
    if (req.apiKeyScope) {
      const projectId = opts.getProjectId?.(req)

      if (!checkApiKeyScope(req.apiKeyScope, { organizationId: orgId, projectId })) {
        emitAudit(app, userId, opts.permissions, req, false, 'api_key_scope_denied')
        addReqLogs({
          req,
          message: 'forbidden — API key scope restriction',
          level: 'warn',
          infos: { organizationId: orgId, projectId },
        })
        reply.code(403).send({ message: 'Forbidden', error: 'API_KEY_SCOPE_DENIED' })
        return
      }
    }

    // ── 2. API key permission check ───────────────────────────────────
    // When `requireAuth` authenticated via API key it cached the key's
    // declared permissions on the request.  We match locally to avoid a
    // second `verifyApiKey` round-trip (which would also double-count
    // rate limits).
    //
    // SECURITY: API-key permissions act as a CAP on what the caller can do.
    // When the request is API-key authenticated AND the key declares an
    // explicit (non-empty, non-wildcard) permission set, the API-key check
    // is AUTHORITATIVE — denying here MUST NOT fall through to org-level
    // role / project-member / ownership checks, otherwise the underlying
    // user's broader permissions would override the key's restrictions.
    //
    // Wildcard permissions (`{ "*": ["*"] }` etc.) are treated as
    // "no extra restriction beyond the user's own perms" → fall through.
    if (req.apiKeyPermissions) {
      if (matchApiKeyPermissions(req.apiKeyPermissions, opts.permissions)) {
        return
      }
      if (req.isApiKey && !isWildcardOnlyPermissions(req.apiKeyPermissions)) {
        emitAudit(app, userId, opts.permissions, req, false, 'api_key_permissions_denied')
        addReqLogs({
          req,
          message: 'forbidden — API key permissions do not cover required actions',
          level: 'warn',
          infos: { required: opts.permissions, granted: req.apiKeyPermissions },
        })
        reply.code(403).send({ message: 'Forbidden', error: 'API_KEY_PERMISSIONS_DENIED' })
        return
      }
    }

    // ── 3. Org-level role check ───────────────────────────────────────
    if (orgId) {
      const hasOrgPermission = await checkOrgPermission(app, userId, orgId, opts.permissions, req.headers as Record<string, string>)
      if (hasOrgPermission) {
        return
      }
    }

    // ── 3b. Project-member role check (additive to org roles) ─────────
    if (opts.getProjectMemberRole) {
      const role = await opts.getProjectMemberRole(req)
      if (role) {
        const allowedActions = PROJECT_MEMBER_ROLE_ACTIONS[role]
        if (allowedActions) {
          const actions = Object.values(opts.permissions).flat()
          const allCovered = actions.every(a => allowedActions.includes(a))
          if (allCovered) {
            return
          }
        }
      }
    }

    // ── 4. Ownership fallback ─────────────────────────────────────────
    if (opts.getOwnerId) {
      const ownerId = await opts.getOwnerId(req)
      if (ownerId === userId) {
        const actions = Object.values(opts.permissions).flat()
        const allCovered = actions.every(a => ownershipActions.includes(a))
        if (allCovered) {
          return
        }
      }
    }

    // ── 5. Deny ───────────────────────────────────────────────────────
    emitAudit(app, userId, opts.permissions, req, false)
    addReqLogs({
      req,
      message: 'forbidden — insufficient permissions',
      level: 'warn',
      infos: { permissions: opts.permissions, organizationId: orgId },
    })
    reply.code(403).send({ message: 'Forbidden', error: 'INSUFFICIENT_PERMISSIONS' })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a request's target org/project falls within the API key's
 * allowed scope. Returns `true` when access is allowed.
 *
 * Rules per dimension:
 *  - scope field is `undefined`  → unrestricted (allow)
 *  - scope field is an empty Set → deny all
 *  - target ID is in the Set     → allow
 *  - target ID is absent (route is not org/project-specific) → allow
 */
export function checkApiKeyScope(
  scope: { organizationIds?: Set<string>, projectIds?: Set<string> },
  target: { organizationId?: string, projectId?: string },
): boolean {
  // Org scope check
  if (scope.organizationIds !== undefined && target.organizationId) {
    if (!scope.organizationIds.has(target.organizationId)) return false
  }
  // Project scope check
  if (scope.projectIds !== undefined && target.projectId) {
    if (!scope.projectIds.has(target.projectId)) return false
  }
  return true
}

/**
 * Check organisation-level permissions via BetterAuth's `hasPermission` API.
 *
 * Lazily imports `auth` to avoid circular module initialization issues.
 */
async function checkOrgPermission(
  app: FastifyRequest['server'],
  userId: string,
  organizationId: string,
  permissions: Record<string, string[]>,
  headers: Record<string, string>,
): Promise<boolean> {
  try {
    const result = await callHasPermission({ headers, userId, organizationId, permissions })
    return result?.success === true
  } catch (error) {
    app.log.error({ error, userId, organizationId }, 'organization permission check failed')
    return false
  }
}

// ---------------------------------------------------------------------------
// Typed wrapper for BetterAuth's `hasPermission` API
// ---------------------------------------------------------------------------

interface HasPermissionParams {
  headers: Headers | Record<string, string>
  userId: string
  organizationId: string
  permissions: Record<string, string[]>
}

/**
 * Call BetterAuth's `hasPermission` API with a properly typed interface.
 *
 * BetterAuth's overloaded type signatures don't match the `dynamicAccessControl`
 * runtime shape, so this wrapper confines the required cast to a single place.
 */
export async function callHasPermission(params: HasPermissionParams): Promise<{ success: boolean } | null> {
  const { auth } = await import('./auth.js')
  const call = auth.api.hasPermission as (...args: unknown[]) => Promise<unknown>
  return call({
    headers: params.headers,
    body: {
      userId: params.userId,
      organizationId: params.organizationId,
      permissions: params.permissions,
    },
  }) as Promise<{ success: boolean } | null>
}

/**
 * Whether the API key's declared permissions consist only of wildcard
 * resources (`*`). Such keys do not act as a restrictive cap and may
 * fall through to the user's own permissions.
 */
function isWildcardOnlyPermissions(granted: Record<string, string[]>): boolean {
  const entries = Object.entries(granted)
  if (entries.length === 0) return true
  return entries.every(([resource]) => resource === '*')
}

/**
 * Check whether the API key's declared permissions cover the required ones.
 *
 * Supports wildcard:
 *  - `{ "*": ["*"] }` — grants everything
 *  - `{ "project": ["*"] }` — grants all actions on "project"
 *  - `{ "*": ["read"] }` — grants "read" on any resource
 */
function matchApiKeyPermissions(
  granted: Record<string, string[]>,
  required: Record<string, string[]>,
): boolean {
  return Object.entries(required).every(([resource, actions]) => {
    const grantedActions = granted[resource] ?? granted['*']
    if (!grantedActions) return false
    return actions.every(a => grantedActions.includes(a) || grantedActions.includes('*'))
  })
}

/**
 * Fire-and-forget audit entry for permission checks.
 */
function emitAudit(
  app: FastifyRequest['server'],
  actorId: string,
  permissions: Record<string, string[]>,
  req: FastifyRequest,
  granted: boolean,
  grantedBy?: string,
): void {
  const auditLogger = app.auditLogger
  if (!auditLogger) return

  const entries = Object.entries(permissions)
  const resource = entries[0]?.[0] ?? 'unknown'
  const actions = entries[0]?.[1] ?? []
  const action = actions.join(',')

  const params = req.params as Record<string, string> | undefined
  const resourceId = params?.id

  const organizationId = getActiveOrgId(req)

  // Track authentication method: 'api_key' vs 'session'
  const authMethod = req.isApiKey ? 'api_key' : 'session'

  auditLogger.logAsync({
    actorId,
    action: `${resource}:${action}`,
    resourceType: resource,
    resourceId,
    organizationId: organizationId ?? null,
    details: {
      granted,
      grantedBy: grantedBy ?? null,
      authMethod,
      method: req.method,
      url: req.url,
    },
  })
}
