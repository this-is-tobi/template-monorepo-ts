import { randomUUID } from 'node:crypto'

import { mockUser } from '~/__mocks__/factories.js'
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
      const full = mockUser(data)
      db.user.create.mockResolvedValueOnce(full)

      const user = await createUserQuery({ ...data, name: `${data.firstname} ${data.lastname}` })

      expect(db.user.create).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual(full)
    })
  })

  describe('getUsersQuery', () => {
    it('should get users', async () => {
      const full = mockUser(data)
      db.user.findMany.mockResolvedValueOnce([full])

      const users = await getUsersQuery()

      expect(db.user.findMany).toHaveBeenCalledTimes(1)
      expect(users).toStrictEqual([full])
    })
  })

  describe('getUserByIdQuery', () => {
    it('should get user by its ID', async () => {
      const full = mockUser(data)
      db.user.findUnique.mockResolvedValueOnce(full)

      const user = await getUserByIdQuery(data.id)

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual(full)
    })
  })

  describe('updateUserQuery', () => {
    it('should update user by its ID', async () => {
      const full = mockUser(data)
      const updatedData = { ...data, bio: 'What a wonderful test' }
      const updatedFull = mockUser(updatedData)

      db.user.findUnique.mockResolvedValueOnce(full)
      db.user.update.mockResolvedValueOnce(updatedFull)

      const user = await updateUserQuery(data.id, {
        name: `${data.firstname} ${data.lastname}`,
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        bio: 'What a wonderful test',
      })

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.update).toHaveBeenCalledTimes(1)
      expect(user).toStrictEqual(updatedFull)
    })

    it('should return null if user is not found', async () => {
      db.user.findUnique.mockResolvedValueOnce(null)

      const user = await updateUserQuery(data.id, {
        name: `${data.firstname} ${data.lastname}`,
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        bio: 'test',
      })

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.update).not.toHaveBeenCalled()
      expect(user).toBeNull()
    })
  })

  describe('deleteUserQuery', () => {
    it('should delete user by its ID', async () => {
      const full = mockUser(data)
      db.user.findUnique.mockResolvedValueOnce(full)
      db.user.delete.mockResolvedValueOnce(full)

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
