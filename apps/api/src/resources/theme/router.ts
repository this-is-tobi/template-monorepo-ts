import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { themeRoutes } from '@template-monorepo-ts/shared'
import { createProtection, createRouteOptions } from '~/utils/index.js'
import { themeMessages } from './constants.js'
import { getThemeQuery, upsertThemeQuery } from './queries.js'

/** Creates the theme router plugin for Fastify. */
export function getThemeRouter() {
  return async (app: FastifyInstance) => {
    const protect = createProtection(app)

    // GET /api/v1/theme — public (theme is needed before login)
    app.get(
      themeRoutes.getTheme.path,
      { ...createRouteOptions(themeRoutes.getTheme) },
      async (_request, reply) => {
        const theme = await getThemeQuery()
        reply.code(200).send({ data: theme })
      },
    )

    // PUT /api/v1/theme — platform admin only.
    //
    // The theme is platform-wide, so this is deliberately NOT an org-level
    // permission: every user owns a personal organization, and an org-scoped
    // statement would let any account restyle the whole instance.
    app.put(
      themeRoutes.updateTheme.path,
      { ...createRouteOptions(themeRoutes.updateTheme), preHandler: protect.admin(themeRoutes.updateTheme) },
      async (request, reply) => {
        // Read the previous theme first: a branding change is only auditable
        // if the entry says what it changed from, as `config:update` does.
        const before = await getThemeQuery()
        const theme = await upsertThemeQuery(request.body as ThemeConfig)
        app.auditLogger?.logAsync({
          actorId: request.session!.user.id,
          action: 'theme:update',
          resourceType: 'theme',
          details: { before, after: theme },
        })
        reply.code(200).send({
          message: themeMessages.updated,
          data: theme,
        })
      },
    )
  }
}
