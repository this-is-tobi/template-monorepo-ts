import fastify from 'fastify'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { swaggerUiConf, swaggerConf, fastifyConf, miscRouter, apiPrefix, handleError } from '@/utils/index.js'
import { exampleRouter } from '@/resources/example/router.js'

const app = fastify(fastifyConf)
  .register(helmet)
  .register(swagger, swaggerConf)
  .register(swaggerUi, swaggerUiConf)
  .register(miscRouter, { prefix: apiPrefix })
  .register(exampleRouter, { prefix: apiPrefix })
  .addHook('onRoute', opts => {
    if (opts.path.includes('/healthz')) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(handleError)

await app.ready()

export default app
