import { s } from '@/app.js'
import { userContract } from './contracts.js'
import { createUser, getUsers, getUserById, updateUser, deleteUser } from './business.js'

export const userRouter = s.router(userContract, {
  createUser: async ({ request: req, body }) => {
    const user = await createUser(req, body)

    return {
      status: 201,
      body: {
        message: 'user successfully created',
        data: user,
      },
    }
  },

  getUsers: async ({ request: req }) => {
    const users = await getUsers(req)

    return {
      status: 200,
      body: {
        message: 'users successfully retrieved',
        data: users,
      },
    }
  },

  getUserById: async ({ request: req, params: { id } }) => {
    const user = await getUserById(req, id)

    if (!user) {
      return {
        status: 404,
        body: {
          message: 'user not found',
        },
      }
    }

    return {
      status: 200,
      body: {
        message: 'user successfully retrieved',
        data: user,
      },
    }
  },

  updateUser: async ({ request: req, params: { id }, body }) => {
    const user = await updateUser(req, id, body)

    return {
      status: 200,
      body: {
        message: 'user successfully updated',
        data: user,
      },
    }
  },

  deleteUser: async ({ request: req, params: { id } }) => {
    const users = await deleteUser(req, id)

    return {
      status: 200,
      body: {
        message: 'user successfully deleted',
        data: users,
      },
    }
  },
})
