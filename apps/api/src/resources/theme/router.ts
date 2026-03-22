import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { themeRoutes } from '@template-monorepo-ts/shared'
import { isAdmin } from '~/modules/auth/middleware.js'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { themeMessages } from './constants.js'
import { getThemeQuery, upsertThemeQuery } from './queries.js'

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

    // PUT /api/v1/theme — admin only
    app.put(
      themeRoutes.updateTheme.path,
      { ...createRouteOptions(themeRoutes.updateTheme), preHandler: [app.requireAuth, createZodValidationHandler(themeRoutes.updateTheme)] },
      async (request, reply) => {
        if (!isAdmin(request)) {
          reply.code(403).send({
            message: themeMessages.forbidden,
            error: 'ADMIN_REQUIRED',
          })
          return
        }

        const theme = await upsertThemeQuery(request.body as ThemeConfig)
        reply.code(200).send({
          message: themeMessages.updated,
          data: theme,
        })
      },
    )
  }
}
