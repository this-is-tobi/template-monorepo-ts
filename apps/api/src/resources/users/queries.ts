import type { User } from '@template-monorepo-ts/shared'

import { db } from '~/prisma/clients.js'

export async function createUserQuery(data: User) {
  return db
    .users
    .create({ data })
}

export async function getUsersQuery() {
  return db
    .users
    .findMany()
}

export async function getUserByIdQuery(id: User['id']) {
  return db
    .users
    .findUnique({ where: { id } })
}

export async function updateUserQuery(id: User['id'], data: Omit<User, 'id'>) {
  return db
    .users
    .update({ where: { id }, data })
}

export async function deleteUserQuery(id: User['id']) {
  return db
    .users
    .delete({ where: { id } })
}
