import { c } from '@/app.ts'
import { CreateUserSchema, GetUserByIdSchema, GetUsersSchema, UpdateUserSchema, DeleteUserSchema, UserSchema } from './schemas.ts'

export const userContract = c.router({
  createUser: {
    method: 'POST',
    path: '/users',
    contentType: 'application/json',
    summary: 'Create user',
    description: 'Create new user.',
    body: UserSchema.omit({ id: true }),
    responses: {
      201: CreateUserSchema.responses['201'],
      400: CreateUserSchema.responses['400'],
      500: CreateUserSchema.responses['500'],
    },
  },

  getUsers: {
    method: 'GET',
    path: '/users',
    summary: 'Get users',
    description: 'Retrieved all users.',
    // query: GetUsersSchema.query,
    responses: {
      200: GetUsersSchema.responses['200'],
      500: GetUsersSchema.responses['500'],
    },
  },

  getUserById: {
    method: 'GET',
    path: '/users/:id',
    summary: 'Get user',
    description: 'Retrieved a user by its ID.',
    pathParams: GetUserByIdSchema.params,
    responses: {
      200: GetUserByIdSchema.responses['200'],
      404: GetUserByIdSchema.responses['404'],
      500: GetUserByIdSchema.responses['500'],
    },
  },

  updateUser: {
    method: 'PUT',
    path: '/users/:id',
    summary: 'Update user',
    description: 'Update a user by its ID.',
    pathParams: UpdateUserSchema.params,
    body: UserSchema.omit({ id: true }),
    responses: {
      200: UpdateUserSchema.responses['200'],
      500: UpdateUserSchema.responses['500'],
    },
  },

  deleteUser: {
    method: 'DELETE',
    path: '/users/:id',
    summary: 'Delete user',
    description: 'Delete a user by its ID.',
    pathParams: DeleteUserSchema.params,
    body: null,
    responses: {
      200: DeleteUserSchema.responses['200'],
      500: DeleteUserSchema.responses['500'],
    },
  },
})
