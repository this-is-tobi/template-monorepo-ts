import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { addReqLogs } from '~/utils/index.js'
import { userMessages } from './constants.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

/**
 * Input type for creating a user via the admin API.
 * Auth-managed fields (name, role, emailVerified, etc.) are auto-set.
 */
export interface CreateUserInput {
  firstname: string
  lastname: string
  email: string
  bio?: string | null
}

/**
 * Input type for updating a user via the admin API.
 */
export interface UpdateUserInput {
  firstname: string
  lastname: string
  email: string
  bio?: string | null
}

export async function createUser(req: FastifyRequest, data: CreateUserInput) {
  const user = await createUserQuery({
    id: randomUUID(),
    name: `${data.firstname} ${data.lastname}`,
    email: data.email,
    firstname: data.firstname,
    lastname: data.lastname,
    bio: data.bio ?? null,
  })

  addReqLogs({ req, message: userMessages.created, infos: { userId: user.id } })
  return user
}

export async function getUsers(req: FastifyRequest) {
  const users = await getUsersQuery()

  addReqLogs({ req, message: userMessages.retrievedAll })
  return users
}

export async function getUserById(req: FastifyRequest, id: string) {
  const user = await getUserByIdQuery(id)

  if (!user) {
    addReqLogs({ req, message: userMessages.notFound, infos: { userId: id }, level: 'warn' })
    return null
  }
  addReqLogs({ req, message: userMessages.retrieved, infos: { userId: id } })
  return user
}

export async function updateUser(req: FastifyRequest, id: string, data: UpdateUserInput) {
  const user = await updateUserQuery(id, {
    name: `${data.firstname} ${data.lastname}`,
    email: data.email,
    firstname: data.firstname,
    lastname: data.lastname,
    bio: data.bio ?? null,
  })

  if (!user) {
    addReqLogs({ req, message: userMessages.notFoundUpdate, infos: { userId: id }, level: 'warn' })
    return null
  }
  addReqLogs({ req, message: userMessages.updated, infos: { userId: id } })
  return user
}

export async function deleteUser(req: FastifyRequest, id: string) {
  const user = await deleteUserQuery(id)

  if (!user) {
    addReqLogs({ req, message: userMessages.notFoundDeletion, infos: { userId: id }, level: 'warn' })
    return null
  }
  addReqLogs({ req, message: userMessages.deleted, infos: { userId: id } })
  return user
}
