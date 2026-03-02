import type { FastifyInstance } from 'fastify'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { addReqLogs } from '~/utils/logger.js'
import { auth } from './auth.js'
import { toHeaders } from './headers.js'

/**
 * Registers the BetterAuth catch-all route.
 * All `/api/v1/auth/*` requests are delegated to BetterAuth's handler which
 * manages sign-up, sign-in, session, 2FA, and OAuth flows.
 */
export function getAuthRouter() {
  return async (app: FastifyInstance) => {
    app.route({
      method: ['GET', 'POST'],
      url: `${apiPrefix.v1}/auth/*`,
      schema: { hide: true }, // hide from Swagger — BetterAuth exposes its own OpenAPI
      handler: async (request, reply) => {
        try {
          const url = new URL(request.url, `http://${request.headers.host}`)

          // Fastify has already parsed the body — re-encode it for the
          // Web Request that BetterAuth expects.  When the raw body is a
          // string (e.g. form data) forward it as-is; when it's an object
          // (Fastify parsed JSON) re-serialise it.
          let reqBody: BodyInit | undefined
          if (request.body !== undefined && request.body !== null) {
            reqBody = typeof request.body === 'string'
              ? request.body
              : JSON.stringify(request.body)
          }

          const req = new Request(url.toString(), {
            method: request.method,
            headers: toHeaders(request.headers),
            ...(reqBody !== undefined ? { body: reqBody } : {}),
          })

          const response = await auth.handler(req)

          reply.code(response.status)
          response.headers.forEach((value, key) => reply.header(key, value))

          const body = response.body ? await response.text() : null
          reply.send(body)
        } catch (error) {
          addReqLogs({ req: request, message: 'auth handler error', error: error instanceof Error ? error : String(error) })
          reply.code(500).send({ message: 'Internal authentication error' })
        }
      },
    })
  }
}
