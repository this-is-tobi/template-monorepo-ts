import type { FastifyRequest } from 'fastify'

/**
 * Typed accessors for BetterAuth session fields on FastifyRequest.
 *
 * BetterAuth decorates the session object with additional fields (role,
 * activeOrganizationId, etc.) that are not part of the base Fastify types.
 * These helpers centralise the narrowing so callers don't need repetitive
 * `as Record<string, unknown>` casts.
 */

export function getUserId(req: FastifyRequest): string | undefined {
  return (req.session?.user as Record<string, unknown> | undefined)?.id as string | undefined
}

export function getUserRole(req: FastifyRequest): string | undefined {
  return (req.session?.user as Record<string, unknown> | undefined)?.role as string | undefined
}

export function getActiveOrgId(req: FastifyRequest): string | undefined {
  return (req.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined
}
