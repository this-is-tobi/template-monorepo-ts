import fastify from 'fastify'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { initServer } from '@ts-rest/fastify'
import { initContract } from '@ts-rest/core'
import { generateOpenApi } from '@ts-rest/open-api'
import { handleError } from './utils/errors.js'

export const s = initServer()
export const c = initContract()

const { userRouter, userContract } = await import('./resources/users/index.js')
const { miscRouter, miscContract, apiPrefix } = await import('./misc/index.js')
const { swaggerUiConf, fastifyConf, swaggerConf } = await import('./utils/index.js')

export const contract = c.router({
  Users: userContract,
  System: miscContract,
})

const openApiDocument = generateOpenApi(contract, swaggerConf)

const app = fastify(fastifyConf)
  .register(helmet)
  .register(swagger, { transformObject: () => openApiDocument })
  .register(swaggerUi, swaggerUiConf)
  .register(s.plugin(miscRouter), { prefix: apiPrefix })
  .register(s.plugin(userRouter), { prefix: apiPrefix })
  .addHook('onRoute', opts => {
    if (opts.path.includes('/healthz')) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(handleError)

await app.ready()

export default app
