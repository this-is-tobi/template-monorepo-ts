import type { User } from '@template-monorepo-ts/shared'

import { db } from '~/prisma/clients.js'

/**
 * Fields accepted when creating a user via admin API.
 * Prisma handles defaults for role, emailVerified, createdAt, updatedAt.
 */
type CreateUserData = Pick<User, 'id' | 'name' | 'email' | 'firstname' | 'lastname'> & { bio?: string | null }

/**
 * Fields accepted when updating a user via admin API.
 */
type UpdateUserData = Pick<User, 'name' | 'email' | 'firstname' | 'lastname'> & { bio?: string | null }

export async function createUserQuery(data: CreateUserData) {
  return db
    .user
    .create({ data })
}

export async function getUsersQuery() {
  return db
    .user
    .findMany()
}

export async function getUserByIdQuery(id: string) {
  return db
    .user
    .findUnique({ where: { id } })
}

export async function updateUserQuery(id: string, data: UpdateUserData) {
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) {
    return null
  }
  return db
    .user
    .update({ where: { id }, data })
}

export async function deleteUserQuery(id: string) {
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) {
    return null
  }
  return db
    .user
    .delete({ where: { id } })
}
