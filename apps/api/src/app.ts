/* eslint-disable antfu/no-top-level-await */
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { getContract } from '@template-monorepo-ts/shared'
import { initServer } from '@ts-rest/fastify'
import { generateOpenApi } from '@ts-rest/open-api'
import fastify from 'fastify'
import { getApiRouter } from '~/resources/index.js'
import { fastifyConf, handleError, swaggerConf, swaggerUiConf } from '~/utils/index.js'

export const serverInstance = initServer()

const openApiDocument = generateOpenApi(await getContract(), swaggerConf, { setOperationId: true })

const app = fastify(fastifyConf)
  .register(helmet)
  .register(swagger, { transformObject: () => openApiDocument })
  .register(swaggerUi, swaggerUiConf)
  .register(getApiRouter())
  .addHook('onRoute', (opts) => {
    if (opts.path.includes('/healthz')) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(handleError)

await app.ready()

export const appLogger = app.log

export default app
