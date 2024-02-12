import { randomUUID } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { type User, UserSchema } from '@template-monorepo-ts/shared'
import { addReqLogs } from '@/utils/index.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

export const createUserValidation = async (req: FastifyRequest, data: Omit<User, 'id'>) => {
  const validation = UserSchema.omit({ id: true }).safeParse(data)
  if (!validation.success) {
    const message = 'failed to validate user schema'
    addReqLogs({ req, message, error: validation.error })
  }
  return validation
}

export const createUser = async (req: FastifyRequest, data: Omit<User, 'id'>) => {
  const user = await createUserQuery({ id: randomUUID(), ...data })

  addReqLogs({ req, message: 'user successfully created', infos: { userId: user.id } })
  return user
}

export const getUsers = async (req: FastifyRequest) => {
  const users = await getUsersQuery()

  addReqLogs({ req, message: 'users successfully retrieved' })
  return users
}

export const getUserById = async (req: FastifyRequest, id: User['id']) => {
  const user = await getUserByIdQuery(id)

  addReqLogs({ req, message: 'user successfully retrieved' })
  return user
}

export const updateUser = async (req: FastifyRequest, id: User['id'], data: Omit<User, 'id'>) => {
  const user = await updateUserQuery(id, data)

  addReqLogs({ req, message: 'user successfully retrieved' })
  return user
}

export const deleteUser = async (req: FastifyRequest, id: User['id']) => {
  deleteUserQuery(id)

  addReqLogs({ req, message: 'user successfully retrieved' })
}
