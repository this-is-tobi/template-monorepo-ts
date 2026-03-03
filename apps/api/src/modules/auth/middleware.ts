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
  }
}

/**
 * Fastify preHandler — requires a valid session (cookie or Bearer token).
 * On success the session is attached at `request.session`.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const session = await auth.api.getSession({ headers: toHeaders(req.headers) })
    if (!session) {
      addReqLogs({ req, message: 'unauthorized access attempt', level: 'warn' })
      reply.code(401).send({ message: 'Unauthorized' })
      return
    }
    req.session = session
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
