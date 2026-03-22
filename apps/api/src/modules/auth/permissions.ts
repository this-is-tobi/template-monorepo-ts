import type { FastifyReply, FastifyRequest } from 'fastify'
import { addReqLogs } from '~/utils/logger.js'
import { isAdmin } from './middleware.js'

// ---------------------------------------------------------------------------
// requirePermission — unified permission middleware
//
// Resolution order:
//  1. Platform admin bypass  (user.role includes 'admin')
//  2. Org-level role check   (BetterAuth organisation membership)
//  3. Ownership fallback     (resource owner === current user)
//  4. Deny
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
}

const DEFAULT_OWNERSHIP_ACTIONS = ['read', 'update', 'delete']

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

    // ── 2. Org-level role check ───────────────────────────────────────
    const orgId = opts.getOrganizationId?.(req)
      ?? (req.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined

    if (orgId) {
      const hasOrgPermission = await checkOrgPermission(app, userId, orgId, opts.permissions)
      if (hasOrgPermission) {
        emitAudit(app, userId, opts.permissions, req, true, 'org_role')
        return
      }
    }

    // ── 3. Ownership fallback ─────────────────────────────────────────
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

    // ── 4. Deny ───────────────────────────────────────────────────────
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
  _app: FastifyRequest['server'],
  userId: string,
  organizationId: string,
  permissions: Record<string, string[]>,
): Promise<boolean> {
  try {
    const { auth } = await import('./auth.js')
    // BetterAuth's hasPermission overload types don't match the
    // dynamicAccessControl runtime shape — cast through unknown.
    const call = auth.api.hasPermission as (...args: unknown[]) => Promise<unknown>
    const result = await call({
      body: {
        userId,
        organizationId,
        permission: permissions,
      },
    }) as { success: boolean } | null
    return result?.success === true
  } catch {
    return false
  }
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

  auditLogger.logAsync({
    actorId,
    action: `${resource}:${action}`,
    resourceType: resource,
    resourceId,
    details: {
      granted,
      grantedBy: grantedBy ?? null,
      method: req.method,
      url: req.url,
    },
  })
}
