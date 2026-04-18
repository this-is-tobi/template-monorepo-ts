import type { RouteDefinition } from '@template-monorepo-ts/shared'
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify'
import type { RequirePermissionOptions } from '~/modules/auth/permissions.js'
import { createZodValidationHandler } from './fastify.js'

/**
 * Builders that produce reusable preHandler chains for Fastify routes.
 *
 * Every builder always starts with `requireAuth` and Zod validation —
 * the only thing that varies is what comes after.  Use these instead of
 * inlining 3-to-5-element preHandler arrays in each route registration:
 *
 * @example
 * const protect = createProtection(app)
 *
 * app.get(routes.list.path, {
 *   ...createRouteOptions(routes.list),
 *   preHandler: protect.auth(routes.list),
 * }, handler)
 *
 * app.delete(routes.delete.path, {
 *   ...createRouteOptions(routes.delete),
 *   preHandler: protect.permission(
 *     routes.delete,
 *     { permissions: { project: ['delete'] }, getProjectId, getOwnerId },
 *     [preloadProject],
 *   ),
 * }, handler)
 */
export function createProtection(app: FastifyInstance) {
  return {
    /** Authenticated user only (auth + Zod validation). */
    auth: (route: RouteDefinition): preHandlerHookHandler[] => [
      app.requireAuth,
      createZodValidationHandler(route),
    ],

    /** Authenticated platform admin (auth + Zod validation + admin role). */
    admin: (route: RouteDefinition): preHandlerHookHandler[] => [
      app.requireAuth,
      createZodValidationHandler(route),
      app.requireRole('admin'),
    ],

    /**
     * Authenticated user with a permission check.  Optional `extra`
     * preHandlers run between Zod validation and the permission check
     * (typically used to preload the resource referenced by the route).
     */
    permission: (
      route: RouteDefinition,
      opts: RequirePermissionOptions | Record<string, string[]>,
      extra: preHandlerHookHandler[] = [],
    ): preHandlerHookHandler[] => [
      app.requireAuth,
      createZodValidationHandler(route),
      ...extra,
      app.requirePermission(opts),
    ],
  }
}

/**
 * Convenience: read a typed param from a request without `as` casts at
 * the call site.  Use for Fastify routes where path params have already
 * been validated by `createZodValidationHandler` upstream.
 *
 * @example
 * const id = getRouteParam<'id'>(req, 'id')
 */
export function getRouteParam<K extends string>(req: FastifyRequest, key: K): string {
  return (req.params as Record<K, string>)[key]
}
