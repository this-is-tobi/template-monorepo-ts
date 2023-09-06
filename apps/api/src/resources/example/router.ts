import type { FastifyServerOptions, FastifyInstance } from 'fastify'
import { createSchema, deleteSchema, readAllSchema, readSchema, updateSchema } from './schemas.js'
import { createResource, getResources, getResourceById, updateResource, deleteResource } from './controllers.js'

export const exampleRouter = async (app: FastifyInstance, _opts: FastifyServerOptions) => {
  app.post('/examples', { schema: createSchema }, createResource)
  app.get('/examples', { schema: readAllSchema }, getResources)
  app.get('/examples/:id', { schema: readSchema }, getResourceById)
  app.put('/examples/:id', { schema: updateSchema }, updateResource)
  app.delete('/examples/:id', { schema: deleteSchema }, deleteResource)
}
