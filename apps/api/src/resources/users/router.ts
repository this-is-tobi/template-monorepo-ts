import type { FastifyInstance } from 'fastify'
import type { CreateUserInput, UpdateUserInput } from './business.js'
import { userRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { createUser, deleteUser, getUserById, getUsers, updateUser } from './business.js'
import { userMessages } from './constants.js'

export function getUserRouter() {
  return async (app: FastifyInstance) => {
    // POST /api/v1/users — admin only
    app.post(
      userRoutes.createUser.path,
      { ...createRouteOptions(userRoutes.createUser), preHandler: [app.requireRole('admin'), createZodValidationHandler(userRoutes.createUser)] },
      async (request, reply) => {
        const user = await createUser(request, request.body as CreateUserInput)

        reply.code(201).send({
          message: userMessages.created,
          data: user,
        })
      },
    )

    // GET /api/v1/users — authenticated
    app.get(
      userRoutes.getUsers.path,
      { ...createRouteOptions(userRoutes.getUsers), preHandler: [app.requireAuth, createZodValidationHandler(userRoutes.getUsers)] },
      async (request, reply) => {
        const users = await getUsers(request)

        reply.code(200).send({
          message: userMessages.retrievedAll,
          data: users,
        })
      },
    )

    // GET /api/v1/users/:id — authenticated
    app.get(
      userRoutes.getUserById.path,
      { ...createRouteOptions(userRoutes.getUserById), preHandler: [app.requireAuth, createZodValidationHandler(userRoutes.getUserById)] },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await getUserById(request, id)

        if (!user) {
          reply.code(404).send({
            message: userMessages.notFound,
            error: 'USER_NOT_FOUND',
          })
          return
        }

        reply.code(200).send({
          message: userMessages.retrieved,
          data: user,
        })
      },
    )

    // PUT /api/v1/users/:id — admin only
    app.put(
      userRoutes.updateUser.path,
      { ...createRouteOptions(userRoutes.updateUser), preHandler: [app.requireRole('admin'), createZodValidationHandler(userRoutes.updateUser)] },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await updateUser(request, id, request.body as UpdateUserInput)

        if (!user) {
          reply.code(404).send({
            message: userMessages.notFound,
          })
          return
        }

        reply.code(200).send({
          message: userMessages.updated,
          data: user,
        })
      },
    )

    // DELETE /api/v1/users/:id — admin only
    app.delete(
      userRoutes.deleteUser.path,
      { ...createRouteOptions(userRoutes.deleteUser), preHandler: [app.requireRole('admin'), createZodValidationHandler(userRoutes.deleteUser)] },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await deleteUser(request, id)

        if (!user) {
          reply.code(404).send({
            message: userMessages.notFound,
          })
          return
        }

        reply.code(200).send({
          message: userMessages.deleted,
        })
      },
    )
  }
}
