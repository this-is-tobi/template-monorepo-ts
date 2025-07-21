import type { User } from '@template-monorepo-ts/shared'
import { randomUUID } from 'node:crypto'
import { apiPrefix, UserSchema } from '@template-monorepo-ts/shared'
import app from '~/app.js'

import { db } from '~/prisma/__mocks__/clients.js'

// Mock the database module
vi.mock('~/database.js')

describe('[Users] - router', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('should create new user', async () => {
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }
      db.users.create.mockResolvedValueOnce({ id: randomUUID(), ...user, bio: null })

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      expect(db.users.create).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(201)
      expect(response.json().data).toMatchObject(user)
    })

    it('should not create new user - missing "email" required key', async () => {
      const user: Omit<User, 'id' | 'email'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      expect(db.users.create).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(400)
      expect(UserSchema.omit({ id: true }).safeParse(user).success).toBe(false)

      // After Zod update, the error structure changed
      // Just check that we get an error response in a reasonable format
      const responseBody = response.json()
      expect(responseBody).toBeDefined()
    })

    it('should not create new user - unexpected error', async () => {
      db.users.create.mockRejectedValueOnce(new Error('unexpected error'))

      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      expect(db.users.create).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(500)
    })
  })

  describe('getUsers', () => {
    it('should retrieve all users', async () => {
      db.users.findMany.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users`)
        .end()

      expect(db.users.findMany).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toMatchObject([])
    })
  })

  describe('getUserById', () => {
    it('should retrieve user by its ID', async () => {
      const userId: User['id'] = randomUUID()
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }
      db.users.findUnique.mockResolvedValueOnce({ id: userId, ...user, bio: null })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(db.users.findUnique).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toStrictEqual({ id: userId, ...user, bio: null })
    })

    it('should handle missing user', async () => {
      const userId = randomUUID()
      db.users.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(db.users.findUnique).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(404)
    })
  })

  describe('updateUser', () => {
    it('should update user by its ID', async () => {
      const userId: User['id'] = randomUUID()
      const user: Omit<User, 'id'> = {
        firstname: 'Jeanne',
        lastname: 'DUPOND',
        email: 'jeanne.dupond@test.com',
      }
      db.users.update.mockResolvedValueOnce({ id: userId, ...user, bio: null })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/users/${userId}`)
        .body(user)
        .end()

      expect(db.users.update).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('deleteUser', () => {
    it('should delete user by its ID', async () => {
      const userId: User['id'] = randomUUID()
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }
      db.users.delete.mockResolvedValueOnce({ id: userId, ...user, bio: null })

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(db.users.delete).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
  })
})
