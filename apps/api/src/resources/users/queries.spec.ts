import { randomUUID } from 'node:crypto'

import { db } from '~/prisma/__mocks__/clients.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

// Mock the database module
vi.mock('~/database.js')

describe('[Users] - Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  const data = {
    id: randomUUID(),
    firstname: 'Jean',
    lastname: 'DUPOND',
    email: 'jean.dupond@test.com',
  }

  describe('createUserQuery', () => {
    it('should create a user', async () => {
      db.user.create.mockResolvedValueOnce({ ...data, bio: null })

      const user = await createUserQuery(data)

      expect(db.user.create).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual({ ...data, bio: null })
    })
  })

  describe('getUsersQuery', () => {
    it('should get users', async () => {
      db.user.findMany.mockResolvedValueOnce([{ ...data, bio: null }])

      const users = await getUsersQuery()

      expect(db.user.findMany).toHaveBeenCalledTimes(1)
      expect(users).toStrictEqual([{ ...data, bio: null }])
    })
  })

  describe('getUserByIdQuery', () => {
    it('should get user by its ID', async () => {
      db.user.findUnique.mockResolvedValueOnce({ ...data, bio: null })

      const user = await getUserByIdQuery(data.id)

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual({ ...data, bio: null })
    })
  })

  describe('updateUserQuery', () => {
    it('should update user by its ID', async () => {
      const updatedUser = { ...data, bio: 'What a wonderful test' }
      db.user.findUnique.mockResolvedValueOnce({ ...data, bio: null })
      db.user.update.mockResolvedValueOnce(updatedUser)

      const user = await updateUserQuery(data.id, { ...data, bio: 'What a wonderful test' })

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.update).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual(updatedUser)
    })

    it('should return null if user is not found', async () => {
      db.user.findUnique.mockResolvedValueOnce(null)

      const user = await updateUserQuery(data.id, { ...data, bio: 'test' })

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.update).not.toHaveBeenCalled()
      expect(user).toBeNull()
    })
  })

  describe('deleteUserQuery', () => {
    it('should delete user by its ID', async () => {
      db.user.findUnique.mockResolvedValueOnce({ ...data, bio: null })
      db.user.delete.mockResolvedValueOnce({ ...data, bio: null })

      await deleteUserQuery(data.id)

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.delete).toHaveBeenCalledTimes(1)
    })

    it('should return null if user is not found', async () => {
      db.user.findUnique.mockResolvedValueOnce(null)

      const user = await deleteUserQuery(data.id)

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.delete).not.toHaveBeenCalled()
      expect(user).toBeNull()
    })
  })
})
