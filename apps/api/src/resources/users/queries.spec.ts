import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'
import { closeDb, initDb } from '@/database.js'

describe('[Users] - Queries', () => {
  beforeAll(async () => {
    await initDb()
  })
  afterAll(async () => {
    await closeDb()
  })

  const data = {
    id: randomUUID(),
    firstname: 'Jean',
    lastname: 'DUPOND',
    email: 'jean.dupond@test.com',
  }

  describe('[createUserQuery]', () => {
    it('Should create a user', async () => {
      const user = await createUserQuery(data)

      expect(user).toStrictEqual(data)
    })
  })

  describe('[getUsersQuery]', () => {
    it('Should get users', async () => {
      const users = await getUsersQuery()

      expect(users).toStrictEqual([data])
    })
  })

  describe('[getUserByIdQuery]', () => {
    it('Should get user by its ID', async () => {
      const user = await getUserByIdQuery(data.id)

      expect(user).toStrictEqual(data)
    })
  })

  describe('[updateUserQuery]', () => {
    it('Should update user by its ID', async () => {
      const updatedUser = { ...data, bio: 'What a wonderful test' }

      const user = await updateUserQuery(data.id, { ...data, bio: 'What a wonderful test' })

      expect(user).toStrictEqual(updatedUser)
    })
  })

  describe('[getUsersQuery]', () => {
    it('Should delete user by its ID', async () => {
      await deleteUserQuery(data.id)
      const users = await getUsersQuery()

      expect(users).toStrictEqual([])
    })
  })
})
