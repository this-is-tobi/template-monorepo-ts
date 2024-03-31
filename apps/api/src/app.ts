import fastify from 'fastify'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { initServer } from '@ts-rest/fastify'
import { generateOpenApi } from '@ts-rest/open-api'
import { getContract } from '@template-monorepo-ts/shared'
import { swaggerUiConf, fastifyConf, swaggerConf, handleError } from '@/utils/index.js'
import { getApiRouter } from '@/resources/index.js'

export const serverInstance = initServer()

const openApiDocument = generateOpenApi(await getContract(), swaggerConf, { setOperationId: true })

const app = fastify(fastifyConf)
  .register(helmet)
  .register(swagger, { transformObject: () => openApiDocument })
  .register(swaggerUi, swaggerUiConf)
  .register(getApiRouter())
  .addHook('onRoute', opts => {
    if (opts.path.includes('/healthz')) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(handleError)

await app.ready()

export default app
