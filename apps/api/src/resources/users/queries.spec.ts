import { randomUUID } from 'node:crypto'
import { closeDb, initDb } from '~/database.js'

import { db } from '~/prisma/__mocks__/clients.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

describe('[Users] - Queries', () => {
  beforeAll(async () => {
    await initDb()
  })
  beforeEach(async () => {
    vi.clearAllMocks()
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

  describe('createUserQuery', () => {
    it('should create a user', async () => {
      db.users.create.mockResolvedValueOnce({ ...data, bio: null })

      const user = await createUserQuery(data)

      expect(db.users.create).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual({ ...data, bio: null })
    })
  })

  describe('getUsersQuery', () => {
    it('should get users', async () => {
      db.users.findMany.mockResolvedValueOnce([{ ...data, bio: null }])

      const users = await getUsersQuery()

      expect(db.users.findMany).toHaveBeenCalledTimes(1)
      expect(users).toStrictEqual([{ ...data, bio: null }])
    })
  })

  describe('getUserByIdQuery', () => {
    it('should get user by its ID', async () => {
      db.users.findUnique.mockResolvedValueOnce({ ...data, bio: null })

      const user = await getUserByIdQuery(data.id)

      expect(db.users.findUnique).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual({ ...data, bio: null })
    })
  })

  describe('updateUserQuery', () => {
    it('should update user by its ID', async () => {
      const updatedUser = { ...data, bio: 'What a wonderful test' }
      db.users.update.mockResolvedValueOnce(updatedUser)

      const user = await updateUserQuery(data.id, { ...data, bio: 'What a wonderful test' })

      expect(db.users.update).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual(updatedUser)
    })
  })

  describe('deleteUserQuery', () => {
    it('should delete user by its ID', async () => {
      db.users.delete.mockResolvedValueOnce({ ...data, bio: null })

      await deleteUserQuery(data.id)

      expect(db.users.delete).toHaveBeenCalledTimes(1)
    })
  })
})
