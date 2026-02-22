import type { User } from '@template-monorepo-ts/shared'

import { db } from '~/prisma/clients.js'

export async function createUserQuery(data: User) {
  return db
    .user
    .create({ data })
}

export async function getUsersQuery() {
  return db
    .user
    .findMany()
}

export async function getUserByIdQuery(id: User['id']) {
  return db
    .user
    .findUnique({ where: { id } })
}

export async function updateUserQuery(id: User['id'], data: Omit<User, 'id'>) {
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) {
    return null
  }
  return db
    .user
    .update({ where: { id }, data })
}

export async function deleteUserQuery(id: User['id']) {
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) {
    return null
  }
  return db
    .user
    .delete({ where: { id } })
}
