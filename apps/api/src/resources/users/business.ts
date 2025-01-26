import type { User } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { addReqLogs } from '~/utils/index.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

export async function createUser(req: FastifyRequest, data: Omit<User, 'id'>) {
  const user = await createUserQuery({ id: randomUUID(), ...data })

  addReqLogs({ req, message: 'user successfully created', infos: { userId: user.id } })
  return user
}

export async function getUsers(req: FastifyRequest) {
  const users = await getUsersQuery()

  addReqLogs({ req, message: 'users successfully retrieved' })
  return users
}

export async function getUserById(req: FastifyRequest, id: User['id']) {
  const user = await getUserByIdQuery(id)

  addReqLogs({ req, message: 'user successfully retrieved', infos: { userId: id } })
  return user
}

export async function updateUser(req: FastifyRequest, id: User['id'], data: Omit<User, 'id'>) {
  const user = await updateUserQuery(id, data)

  addReqLogs({ req, message: 'user successfully retrieved', infos: { userId: id } })
  return user
}

export async function deleteUser(req: FastifyRequest, id: User['id']) {
  const users = deleteUserQuery(id)

  addReqLogs({ req, message: 'user successfully retrieved', infos: { userId: id } })
  return users
}
