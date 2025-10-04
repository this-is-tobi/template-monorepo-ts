import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import {
  CreateUserSchema,
  DeleteUserSchema,
  GetUserByIdSchema,
  GetUsersSchema,
  UpdateUserSchema,
  UserSchema,
} from '../schemas/index.js'

/**
 * User API route definitions
 */
export const userRoutes = {
  createUser: {
    method: 'POST',
    path: `${apiPrefix.v1}/users`,
    summary: 'Create user',
    description: 'Create new user.',
    tags: ['Users'],
    body: UserSchema.omit({ id: true }),
    responses: CreateUserSchema.responses,
  },

  getUsers: {
    method: 'GET',
    path: `${apiPrefix.v1}/users`,
    summary: 'Get users',
    description: 'Retrieved all users.',
    tags: ['Users'],
    responses: GetUsersSchema.responses,
  },

  getUserById: {
    method: 'GET',
    path: `${apiPrefix.v1}/users/:id`,
    summary: 'Get user',
    description: 'Retrieved user by id.',
    tags: ['Users'],
    params: GetUserByIdSchema.params,
    responses: GetUserByIdSchema.responses,
  },

  updateUser: {
    method: 'PUT',
    path: `${apiPrefix.v1}/users/:id`,
    summary: 'Update user',
    description: 'Update user by id.',
    tags: ['Users'],
    params: UpdateUserSchema.params,
    body: UserSchema.omit({ id: true }),
    responses: UpdateUserSchema.responses,
  },

  deleteUser: {
    method: 'DELETE',
    path: `${apiPrefix.v1}/users/:id`,
    summary: 'Delete user',
    description: 'Delete user by id.',
    tags: ['Users'],
    params: DeleteUserSchema.params,
    responses: DeleteUserSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
