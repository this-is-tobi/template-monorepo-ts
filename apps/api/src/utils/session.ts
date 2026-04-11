import type { FastifyRequest } from 'fastify'

/**
 * BetterAuth adds these fields to the session objects at runtime but they
 * are not part of the base Fastify/BetterAuth types.  These accessors
 * centralise the narrowing so callers don't need ad-hoc
 * `as Record<string, unknown>` casts.
 *
 * All functions guard against missing session (returns `undefined`).
 */

/** The extra fields BetterAuth adds to `session.user` at runtime. */
export interface AppUser {
  id: string
  name?: string
  email?: string
  image?: string
  role?: string
  firstname?: string
  lastname?: string
  bio?: string
}

/** The extra fields BetterAuth adds to `session.session` at runtime. */
export interface AppSessionRecord {
  id: string
  userId: string
  activeOrganizationId?: string
}

export function getUserId(req: FastifyRequest): string | undefined {
  return (req.session?.user as AppUser | undefined)?.id
}

export function getUserRole(req: FastifyRequest): string | undefined {
  return (req.session?.user as AppUser | undefined)?.role
}

export function getActiveOrgId(req: FastifyRequest): string | undefined {
  return (req.session?.session as AppSessionRecord | undefined)?.activeOrganizationId
}

/**
 * Extract the active org ID from a raw BetterAuth session object.
 * Use this when the session comes from `auth.api.getSession()` rather than `req.session`.
 */
export function getActiveOrgIdFromSession(session: { session?: unknown }): string | undefined {
  return (session.session as AppSessionRecord | undefined)?.activeOrganizationId
}
