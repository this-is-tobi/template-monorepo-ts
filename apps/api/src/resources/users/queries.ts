import { type User } from '@template-monorepo-ts/shared'
import { db } from '@/prisma/clients.js'

export const createUserQuery = async (data: User) => {
  return db
    .users
    .create({ data })
}

export const getUsersQuery = async () => {
  return db
    .users
    .findMany()
}

export const getUserByIdQuery = async (id: User['id']) => {
  return db
    .users
    .findUnique({ where: { id } })
}

export const updateUserQuery = async (id: User['id'], data: Omit<User, 'id'>) => {
  return db
    .users
    .update({ where: { id }, data })
}

export const deleteUserQuery = async (id: User['id']) => {
  return db
    .users
    .delete({ where: { id } })
}

// Technical fonctions
export const _deleteUsers = async () => {
  await db
    .users
    .deleteMany({})
}
