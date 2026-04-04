import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from '~/utils/logger.js'
import { isAdmin } from './middleware.js'

// ---------------------------------------------------------------------------
// requirePermission — unified permission middleware
//
// Resolution order:
//  1. Platform admin bypass  (user.role includes 'admin')
//  2. API key permissions    (cached from requireAuth)
//  3. Org-level role check   (BetterAuth organisation membership)
//  4. Ownership fallback     (resource owner === current user)
//  5. Deny
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
  getOrganizationId?: (req: FastifyRequest) => string | undefined
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
    const user = req.session?.user as Record<string, unknown> | undefined
    if (!user) {
      reply.code(401).send({ message: 'Unauthorized' })
      return
    }

    const userId = user.id as string
    const app = req.server

    // ── 1. Platform admin bypass ──────────────────────────────────────
    if (isAdmin(req)) {
      emitAudit(app, userId, opts.permissions, req, true, 'platform_admin')
      return
    }

    // ── 2. API key permission check ───────────────────────────────────
    // When `requireAuth` authenticated via API key it cached the key's
    // declared permissions on the request.  We match locally to avoid a
    // second `verifyApiKey` round-trip (which would also double-count
    // rate limits).
    if (req.apiKeyPermissions) {
      if (matchApiKeyPermissions(req.apiKeyPermissions, opts.permissions)) {
        emitAudit(app, userId, opts.permissions, req, true, 'api_key')
        return
      }
    }

    // ── 3. Org-level role check ───────────────────────────────────────
    const orgId = opts.getOrganizationId?.(req)
      ?? (req.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined

    if (orgId) {
      const hasOrgPermission = await checkOrgPermission(app, userId, orgId, opts.permissions, req.headers as Record<string, string>)
      if (hasOrgPermission) {
        emitAudit(app, userId, opts.permissions, req, true, 'org_role')
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
            emitAudit(app, userId, opts.permissions, req, true, 'project_member')
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
          emitAudit(app, userId, opts.permissions, req, true, 'ownership')
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
    const { auth } = await import('./auth.js')
    // BetterAuth's hasPermission overload types don't match the
    // dynamicAccessControl runtime shape — cast through unknown.
    const call = auth.api.hasPermission as (...args: unknown[]) => Promise<unknown>
    const result = await call({
      headers,
      body: {
        userId,
        organizationId,
        permissions,
      },
    }) as { success: boolean } | null
    return result?.success === true
  } catch (error) {
    app.log.error({ error, userId, organizationId }, 'organization permission check failed')
    return false
  }
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

  const organizationId = (req.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined

  auditLogger.logAsync({
    actorId,
    action: `${resource}:${action}`,
    resourceType: resource,
    resourceId,
    organizationId: organizationId ?? null,
    details: {
      granted,
      grantedBy: grantedBy ?? null,
      method: req.method,
      url: req.url,
    },
  })
}
