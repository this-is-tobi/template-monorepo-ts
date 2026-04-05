import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { themeRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { themeMessages } from './constants.js'
import { getThemeQuery, upsertThemeQuery } from './queries.js'

/** Creates the theme router plugin for Fastify. */
export function getThemeRouter() {
  return async (app: FastifyInstance) => {
    // GET /api/v1/theme — public (theme is needed before login)
    app.get(
      themeRoutes.getTheme.path,
      { ...createRouteOptions(themeRoutes.getTheme) },
      async (_request, reply) => {
        const theme = await getThemeQuery()
        reply.code(200).send({ data: theme })
      },
    )

    // PUT /api/v1/theme — requires theme:update permission
    app.put(
      themeRoutes.updateTheme.path,
      { ...createRouteOptions(themeRoutes.updateTheme), preHandler: [app.requireAuth, createZodValidationHandler(themeRoutes.updateTheme), app.requirePermission({ theme: ['update'] })] },
      async (request, reply) => {
        const theme = await upsertThemeQuery(request.body as ThemeConfig)
        app.auditLogger?.logAsync({
          actorId: request.session!.user.id,
          action: 'theme:update',
          resourceType: 'theme',
        })
        reply.code(200).send({
          message: themeMessages.updated,
          data: theme,
        })
      },
    )
  }
}
