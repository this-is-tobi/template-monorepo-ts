import { randomUUID } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { type User } from '@template-monorepo-ts/shared'
import { addReqLogs } from '@/utils/index.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

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

  addReqLogs({ req, message: 'user successfully retrieved', infos: { userId: id } })
  return user
}

export const updateUser = async (req: FastifyRequest, id: User['id'], data: Omit<User, 'id'>) => {
  const user = await updateUserQuery(id, data)

  addReqLogs({ req, message: 'user successfully retrieved', infos: { userId: id } })
  return user
}

export const deleteUser = async (req: FastifyRequest, id: User['id']) => {
  const users = deleteUserQuery(id)

  addReqLogs({ req, message: 'user successfully retrieved', infos: { userId: id } })
  return users
}
