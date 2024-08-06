import { apiPrefix, contractInstance } from '@/api-client.js'
import { CreateUserSchema, DeleteUserSchema, GetUserByIdSchema, GetUsersSchema, UpdateUserSchema, UserSchema } from '@/schemas/index.js'

export const userContract = contractInstance.router({
  createUser: {
    method: 'POST',
    path: `${apiPrefix.v1}/users`,
    contentType: 'application/json',
    summary: 'Create user',
    description: 'Create new user.',
    body: UserSchema.omit({ id: true }),
    responses: CreateUserSchema.responses,
  },

  getUsers: {
    method: 'GET',
    path: `${apiPrefix.v1}/users`,
    summary: 'Get users',
    description: 'Retrieved all users.',
    // query: GetUsersSchema.query,
    responses: GetUsersSchema.responses,
  },

  getUserById: {
    method: 'GET',
    path: `${apiPrefix.v1}/users/:id`,
    summary: 'Get user',
    description: 'Retrieved a user by its ID.',
    pathParams: GetUserByIdSchema.params,
    responses: GetUserByIdSchema.responses,
  },

  updateUser: {
    method: 'PUT',
    path: `${apiPrefix.v1}/users/:id`,
    summary: 'Update user',
    description: 'Update a user by its ID.',
    pathParams: UpdateUserSchema.params,
    body: UserSchema.omit({ id: true }),
    responses: UpdateUserSchema.responses,
  },

  deleteUser: {
    method: 'DELETE',
    path: `${apiPrefix.v1}/users/:id`,
    summary: 'Delete user',
    description: 'Delete a user by its ID.',
    pathParams: DeleteUserSchema.params,
    body: null,
    responses: DeleteUserSchema.responses,
  },
})
