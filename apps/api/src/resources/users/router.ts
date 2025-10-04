import type { FastifyInstance } from 'fastify'
import { userRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions } from '~/utils/index.js'
import { createUser, deleteUser, getUserById, getUsers, updateUser } from './business.js'

export function getUserRouter() {
  return async (app: FastifyInstance) => {
    // POST /api/v1/users
    app.post(
      userRoutes.createUser.path,
      createRouteOptions(userRoutes.createUser),
      async (request, reply) => {
        const user = await createUser(request, request.body as { firstname: string, lastname: string, email: string, bio?: string | null })

        reply.code(201).send({
          message: 'user successfully created',
          data: user,
        })
      },
    )

    // GET /api/v1/users
    app.get(
      userRoutes.getUsers.path,
      createRouteOptions(userRoutes.getUsers),
      async (request, reply) => {
        const users = await getUsers(request)

        reply.code(200).send({
          message: 'users successfully retrieved',
          data: users,
        })
      },
    )

    // GET /api/v1/users/:id
    app.get(
      userRoutes.getUserById.path,
      createRouteOptions(userRoutes.getUserById),
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await getUserById(request, id)

        if (!user) {
          reply.code(404).send({
            message: 'user not found',
          })
          return
        }

        reply.code(200).send({
          message: 'user successfully retrieved',
          data: user,
        })
      },
    )

    // PUT /api/v1/users/:id
    app.put(
      userRoutes.updateUser.path,
      createRouteOptions(userRoutes.updateUser),
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await updateUser(request, id, request.body as { firstname: string, lastname: string, email: string, bio?: string | null })

        if (!user) {
          reply.code(404).send({
            message: 'user not found',
          })
          return
        }

        reply.code(200).send({
          message: 'user successfully updated',
          data: user,
        })
      },
    )

    // DELETE /api/v1/users/:id
    app.delete(
      userRoutes.deleteUser.path,
      createRouteOptions(userRoutes.deleteUser),
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const user = await deleteUser(request, id)

        if (!user) {
          reply.code(404).send({
            message: 'user not found',
          })
          return
        }

        reply.code(200).send({
          message: 'user successfully deleted',
        })
      },
    )
  }
}
