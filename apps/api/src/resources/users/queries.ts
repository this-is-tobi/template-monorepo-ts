import { type User } from '@template-monorepo-ts/shared'
import { db } from '@/database.js'

export const createUserQuery = async (data: User) => {
  db.push(data)
  const user = db[db.length - 1]
  return user
}

export const getUsersQuery = async () => {
  const users = db
  return users
}

export const getUserByIdQuery = async (id: User['id']) => {
  const user = db.find(user => user.id === id)
  return user
}

export const updateUserQuery = async (id: User['id'], data: Omit<User, 'id'>) => {
  const index = db.findIndex(user => user.id === id)
  db[index] = { id: db[index].id, ...data }
  return db[index]
}

export const deleteUserQuery = async (id: User['id']) => {
  const index = db.findIndex(user => user.id === id)
  db.splice(index, 1)
  return db
}

// Technical fonctions
export const _deleteUsers = async () => {
  db.splice(0, db.length)
}
