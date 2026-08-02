import type { AppConfig } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { configRoutes } from '@template-monorepo-ts/shared'
import { createProtection, createRouteOptions, describeRuntimeConfig } from '~/utils/index.js'
import { configMessages } from './constants.js'
import { getConfigQuery, getLockedConfigFields, getSsoProviders, isEmailPasswordEnabled, upsertConfigQuery } from './queries.js'

/** Creates the config router plugin for Fastify. */
export function getConfigRouter() {
  return async (app: FastifyInstance) => {
    const protect = createProtection(app)

    // GET /api/v1/config — public (needed before login to check registration)
    app.get(
      configRoutes.getConfig.path,
      { ...createRouteOptions(configRoutes.getConfig) },
      async (_request, reply) => {
        const config = await getConfigQuery()
        reply.code(200).send({
          data: config,
          ssoProviders: getSsoProviders(),
          emailPasswordEnabled: isEmailPasswordEnabled(),
          lockedFields: getLockedConfigFields(),
        })
      },
    )

    // PUT /api/v1/config — platform admin only.
    //
    // These settings govern the whole instance (registration, quotas,
    // maintenance mode), so this is deliberately NOT an org-level permission:
    // every user owns a personal organization, and an org-scoped statement
    // would let any account lock the platform out.
    app.put(
      configRoutes.updateConfig.path,
      { ...createRouteOptions(configRoutes.updateConfig), preHandler: protect.admin(configRoutes.updateConfig) },
      async (request, reply) => {
        const before = await getConfigQuery()
        const config = await upsertConfigQuery(request.body as AppConfig)
        app.auditLogger?.logAsync({
          actorId: request.session!.user.id,
          action: 'config:update',
          resourceType: 'config',
          details: { before, after: config },
        })
        reply.code(200).send({
          message: configMessages.updated,
          data: config,
        })
      },
    )

    // GET /api/v1/config/runtime — platform admin only.
    //
    // Reveals deployment topology (hosts, issuers, pool sizes), so org admins
    // must not reach it. Secret values are redacted server-side before the
    // payload is built, never in the client.
    app.get(
      configRoutes.getRuntimeConfig.path,
      { ...createRouteOptions(configRoutes.getRuntimeConfig), preHandler: protect.admin(configRoutes.getRuntimeConfig) },
      async (_request, reply) => {
        reply.code(200).send({ entries: await describeRuntimeConfig() })
      },
    )
  }
}
