import { type User } from '@template-monorepo-ts/shared'

const usersDB: User[] = []

export const createUserQuery = async (data: User) => {
  usersDB.push(data)
  return data
}

export const getUsersQuery = async () => {
  const users = usersDB

  return users
}

export const getUserByIdQuery = async (id: User['id']) => {
  const user = usersDB.find(user => user.id === id)

  return user
}

export const updateUserQuery = async (id: User['id'], data: Omit<User, 'id'>) => {
  const index = usersDB.findIndex(user => user.id === id)
  const user = { id, ...data }
  usersDB[index] = user

  return user
}

export const deleteUserQuery = async (id: User['id']) => {
  const index = usersDB.findIndex(user => user.id === id)
  usersDB.splice(index, 1)
}

// Technical fonctions
export const _deleteUsers = async () => {
  usersDB.splice(0, usersDB.length)
}
